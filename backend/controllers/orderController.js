const Order = require('../models/Order');
const Product = require('../models/Product');
const { buildPaginationResponse, parsePaginationParams, calculatePlatformFee } = require('../utils/helpers');
const { sendNotification } = require('../services/notificationService');

// Create new order
exports.createOrder = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({
        success: false,
        message: 'Only buyers can place orders'
      });
    }

    const { products, shippingAddress, paymentMethod } = req.body;

    // Validate and calculate order totals
    let totalAmount = 0;
    const orderProducts = [];
    let sellerId = null;
    let storeId = null;

    for (const item of products) {
      const product = await Product.findById(item.productId);
      
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product ${product?.name || 'unknown'} is not available`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`
        });
      }

      // For this implementation, assuming single seller per order
      if (!sellerId) {
        sellerId = product.sellerId;
        storeId = product.storeId;
      } else if (sellerId.toString() !== product.sellerId.toString()) {
        return res.status(400).json({
          success: false,
          message: 'All products must be from the same seller'
        });
      }

      const itemPrice = product.discountPrice || product.price;
      const itemTotal = itemPrice * item.quantity;
      totalAmount += itemTotal;

      orderProducts.push({
        productId: product._id,
        name: product.name,
        price: itemPrice,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        images: product.images.slice(0, 1) // First image only
      });
    }

    // Calculate fees
    const platformFee = calculatePlatformFee(totalAmount);
    const deliveryFee = totalAmount > 500 ? 0 : 50; // Free delivery above ₹500
    const finalAmount = totalAmount + platformFee + deliveryFee;
    const sellerAmount = totalAmount - platformFee;

    // Create order
    const order = new Order({
      buyerId: req.user._id,
      sellerId,
      storeId,
      products: orderProducts,
      totalAmount,
      platformFee,
      deliveryFee,
      finalAmount,
      sellerAmount,
      shippingAddress,
      paymentMethod
    });

    await order.save();

    // Reduce product stock
    for (const item of products) {
      await Product.findByIdAndUpdate(
        item.productId,
        {
          $inc: { 
            stock: -item.quantity,
            totalSold: item.quantity
          }
        }
      );
    }

    await order.populate([
      { path: 'buyerId', select: 'name email phone' },
      { path: 'sellerId', select: 'name email phone' },
      { path: 'storeId', select: 'storeName address' }
    ]);

    // Send notifications
    await sendNotification(sellerId, 'order_placed', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: totalAmount
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Get user orders
exports.getUserOrders = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { status } = req.query;

    const filter = {};
    
    if (req.user.role === 'buyer') {
      filter.buyerId = req.user._id;
    } else if (req.user.role === 'seller') {
      filter.sellerId = req.user._id;
    }

    if (status) {
      filter.orderStatus = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('buyerId', 'name phone')
        .populate('sellerId', 'name phone')
        .populate('storeId', 'storeName')
        .lean(),
      Order.countDocuments(filter)
    ]);

    const response = buildPaginationResponse(orders, total, page, limit);

    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Get single order
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyerId', 'name email phone')
      .populate('sellerId', 'name email phone')
      .populate('storeId', 'storeName address contactNumber')
      .populate('products.productId', 'name images')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user has permission to view this order
    const userId = req.user._id.toString();
    if (order.buyerId._id.toString() !== userId && order.sellerId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this order'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

// Update order status (sellers only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    
    const order = await Order.findOne({
      _id: req.params.id,
      sellerId: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission'
      });
    }

    // Validate status transition
    const validTransitions = {
      placed: ['confirmed', 'cancelled'],
      confirmed: ['packed', 'cancelled'],
      packed: ['shipped'],
      shipped: ['out_for_delivery'],
      out_for_delivery: ['delivered'],
      delivered: [],
      cancelled: [],
      returned: []
    };

    if (!validTransitions[order.orderStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${order.orderStatus} to ${status}`
      });
    }

    await order.updateStatus(status, note, req.user._id);

    // Send notification to buyer
    await sendNotification(order.buyerId, `order_${status}`, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const order = await Order.findOne({
      _id: req.params.id,
      buyerId: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or you do not have permission'
      });
    }

    // Check if order can be cancelled
    if (!['placed', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage'
      });
    }

    // Check cancellation time limit (1 hour)
    const orderTime = new Date(order.createdAt);
    const currentTime = new Date();
    const hoursDiff = (currentTime - orderTime) / (1000 * 60 * 60);

    if (hoursDiff > 1) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled after 1 hour'
      });
    }

    await order.updateStatus('cancelled', `Cancelled by buyer: ${reason}`, req.user._id);
    order.cancelReason = reason;
    await order.save();

    // Restore product stock
    for (const item of order.products) {
      await Product.findByIdAndUpdate(
        item.productId,
        {
          $inc: { 
            stock: item.quantity,
            totalSold: -item.quantity
          }
        }
      );
    }

    // Send notification to seller
    await sendNotification(order.sellerId, 'order_cancelled', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      reason
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

// Get seller orders
exports.getSellerOrders = async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can access this endpoint'
      });
    }

    const { page, limit, skip } = parsePaginationParams(req.query);
    const { status, storeId } = req.query;

    const filter = { sellerId: req.user._id };
    
    if (status) {
      filter.orderStatus = status;
    }
    
    if (storeId) {
      filter.storeId = storeId;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('buyerId', 'name phone')
        .populate('storeId', 'storeName')
        .lean(),
      Order.countDocuments(filter)
    ]);

    const response = buildPaginationResponse(orders, total, page, limit);

    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};
