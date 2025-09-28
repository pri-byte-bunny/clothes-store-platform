const Bargain = require('../models/Bargain');
const Product = require('../models/Product');
const { buildPaginationResponse, parsePaginationParams } = require('../utils/helpers');
const { sendNotification } = require('../services/notificationService');

// Create bargain request
exports.createBargain = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({
        success: false,
        message: 'Only buyers can create bargain requests'
      });
    }

    const { productId, proposedPrice, quantity = 1, selectedSize, selectedColor } = req.body;

    const product = await Product.findById(productId).populate('sellerId', 'name');
    
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or not available'
      });
    }

    if (!product.isBargainable) {
      return res.status(400).json({
        success: false,
        message: 'This product is not available for bargaining'
      });
    }

    // Check if buyer already has pending bargain for this product
    const existingBargain = await Bargain.findOne({
      productId,
      buyerId: req.user._id,
      status: { $in: ['pending', 'countered'] }
    });

    if (existingBargain) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending bargain for this product'
      });
    }

    const currentPrice = product.discountPrice || product.price;
    
    // Validate proposed price
    if (proposedPrice >= currentPrice) {
      return res.status(400).json({
        success: false,
        message: 'Proposed price must be less than current price'
      });
    }

    if (product.minPrice && proposedPrice < product.minPrice) {
      return res.status(400).json({
        success: false,
        message: `Minimum bargain price is ₹${product.minPrice}`
      });
    }

    const bargain = new Bargain({
      productId,
      buyerId: req.user._id,
      sellerId: product.sellerId,
      originalPrice: currentPrice,
      proposedPrice,
      quantity,
      selectedSize,
      selectedColor
    });

    await bargain.save();
    await bargain.populate([
      { path: 'productId', select: 'name images' },
      { path: 'buyerId', select: 'name' }
    ]);

    // Send notification to seller
    await sendNotification(product.sellerId, 'bargain_received', {
      bargainId: bargain._id,
      productName: product.name,
      proposedPrice,
      buyerName: req.user.name
    });

    res.status(201).json({
      success: true,
      message: 'Bargain request sent successfully',
      bargain
    });
  } catch (error) {
    console.error('Create bargain error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bargain request',
      error: error.message
    });
  }
};

// Get user bargains
exports.getUserBargains = async (req, res) => {
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
      filter.status = status;
    }

    const [bargains, total] = await Promise.all([
      Bargain.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('productId', 'name images')
        .populate('buyerId', 'name')
        .populate('sellerId', 'name')
        .lean(),
      Bargain.countDocuments(filter)
    ]);

    // Check and update expired bargains
    const expiredBargains = bargains.filter(b => 
      ['pending', 'countered'].includes(b.status) && new Date() > new Date(b.expiresAt)
    );

    for (const expired of expiredBargains) {
      await Bargain.findByIdAndUpdate(expired._id, { status: 'expired' });
      expired.status = 'expired';
    }

    const response = buildPaginationResponse(bargains, total, page, limit);

    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('Get user bargains error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bargains',
      error: error.message
    });
  }
};

// Respond to bargain (sellers only)
exports.respondToBargain = async (req, res) => {
  try {
    const { action, counterOffer, message } = req.body; // action: 'accept', 'reject', 'counter'
    
    const bargain = await Bargain.findOne({
      _id: req.params.id,
      sellerId: req.user._id
    }).populate('productId', 'name');

    if (!bargain) {
      return res.status(404).json({
        success: false,
        message: 'Bargain not found or you do not have permission'
      });
    }

    if (!['pending', 'countered'].includes(bargain.status)) {
      return res.status(400).json({
        success: false,
        message: 'This bargain is no longer active'
      });
    }

    // Check if expired
    if (new Date() > bargain.expiresAt) {
      bargain.status = 'expired';
      await bargain.save();
      return res.status(400).json({
        success: false,
        message: 'This bargain has expired'
      });
    }

    let notificationType = '';
    let notificationData = {
      bargainId: bargain._id,
      productName: bargain.productId.name
    };

    switch (action) {
      case 'accept':
        await bargain.accept(req.user._id);
        notificationType = 'bargain_accepted';
        notificationData.finalPrice = bargain.finalPrice;
        break;
        
      case 'reject':
        await bargain.reject(message);
        notificationType = 'bargain_rejected';
        notificationData.reason = message;
        break;
        
      case 'counter':
        if (!counterOffer) {
          return res.status(400).json({
            success: false,
            message: 'Counter offer amount is required'
          });
        }
        
        bargain.counterOffer = counterOffer;
        bargain.status = 'countered';
        bargain.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Reset expiry
        await bargain.save();
        
        notificationType = 'bargain_countered';
        notificationData.counterOffer = counterOffer;
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid action'
        });
    }

    if (message) {
      await bargain.addMessage('seller', message);
    }

    // Send notification to buyer
    await sendNotification(bargain.buyerId, notificationType, notificationData);

    res.json({
      success: true,
      message: `Bargain ${action}ed successfully`,
      bargain
    });
  } catch (error) {
    console.error('Respond to bargain error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to respond to bargain',
      error: error.message
    });
  }
};

// Get single bargain
exports.getBargainById = async (req, res) => {
  try {
    const bargain = await Bargain.findById(req.params.id)
      .populate('productId', 'name images price discountPrice')
      .populate('buyerId', 'name')
      .populate('sellerId', 'name')
      .lean();

    if (!bargain) {
      return res.status(404).json({
        success: false,
        message: 'Bargain not found'
      });
    }

    // Check permission
    const userId = req.user._id.toString();
    if (bargain.buyerId._id.toString() !== userId && bargain.sellerId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this bargain'
      });
    }

    res.json({
      success: true,
      bargain
    });
  } catch (error) {
    console.error('Get bargain error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bargain',
      error: error.message
    });
  }
};

// Get seller bargains
exports.getSellerBargains = async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can access this endpoint'
      });
    }

    const { page, limit, skip } = parsePaginationParams(req.query);
    const { status } = req.query;

    const filter = { sellerId: req.user._id };
    
    if (status) {
      filter.status = status;
    }

    const [bargains, total] = await Promise.all([
      Bargain.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('productId', 'name images')
        .populate('buyerId', 'name')
        .lean(),
      Bargain.countDocuments(filter)
    ]);

    const response = buildPaginationResponse(bargains, total, page, limit);

    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('Get seller bargains error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bargains',
      error: error.message
    });
  }
};