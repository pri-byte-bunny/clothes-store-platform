const Razorpay = require('razorpay');
const Stripe = require('stripe');
const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');

// Initialize payment gateways
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const paymentController = {
  // Create Razorpay order
  createRazorpayOrder: async (req, res) => {
    try {
      const { amount, currency = 'INR', orderId } = req.body;
      
      // Verify order exists and belongs to user
      const order = await Order.findById(orderId);
      if (!order || order.user.toString() !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const options = {
        amount: amount * 100, // Convert to paise
        currency,
        receipt: `order_${orderId}`,
        payment_capture: 1
      };

      const razorpayOrder = await razorpay.orders.create(options);

      // Update order with payment details
      order.paymentDetails = {
        gateway: 'razorpay',
        gatewayOrderId: razorpayOrder.id,
        amount: amount,
        currency
      };
      await order.save();

      res.json({
        success: true,
        order: razorpayOrder,
        key: process.env.RAZORPAY_KEY_ID
      });

    } catch (error) {
      console.error('Razorpay order creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment order',
        error: error.message
      });
    }
  },

  // Verify Razorpay payment
  verifyRazorpayPayment: async (req, res) => {
    try {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        orderId 
      } = req.body;

      // Create signature
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature'
        });
      }

      // Update order status
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      order.paymentStatus = 'completed';
      order.status = 'confirmed';
      order.paymentDetails.transactionId = razorpay_payment_id;
      order.paymentDetails.signature = razorpay_signature;
      order.paidAt = new Date();

      await order.save();

      res.json({
        success: true,
        message: 'Payment verified successfully',
        order
      });

    } catch (error) {
      console.error('Payment verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Payment verification failed',
        error: error.message
      });
    }
  },

  // Create Stripe payment intent
  createStripePaymentIntent: async (req, res) => {
    try {
      const { amount, currency = 'usd', orderId } = req.body;

      // Verify order exists and belongs to user
      const order = await Order.findById(orderId);
      if (!order || order.user.toString() !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency,
        metadata: {
          orderId: orderId.toString(),
          userId: req.user.id
        }
      });

      // Update order with payment details
      order.paymentDetails = {
        gateway: 'stripe',
        gatewayOrderId: paymentIntent.id,
        amount: amount,
        currency
      };
      await order.save();

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });

    } catch (error) {
      console.error('Stripe payment intent error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create payment intent',
        error: error.message
      });
    }
  },

  // Confirm Stripe payment
  confirmStripePayment: async (req, res) => {
    try {
      const { paymentIntentId, orderId } = req.body;

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: 'Payment not completed'
        });
      }

      // Update order status
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      order.paymentStatus = 'completed';
      order.status = 'confirmed';
      order.paymentDetails.transactionId = paymentIntent.id;
      order.paidAt = new Date();

      await order.save();

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        order
      });

    } catch (error) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({
        success: false,
        message: 'Payment confirmation failed',
        error: error.message
      });
    }
  },

  // Get payment methods for user
  getPaymentMethods: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('paymentMethods');
      
      res.json({
        success: true,
        paymentMethods: user.paymentMethods || []
      });

    } catch (error) {
      console.error('Get payment methods error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment methods',
        error: error.message
      });
    }
  },

  // Add payment method (for Stripe)
  addPaymentMethod: async (req, res) => {
    try {
      const { paymentMethodId, isDefault = false } = req.body;

      // Get or create Stripe customer
      let user = await User.findById(req.user.id);
      
      if (!user.stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: { userId: user._id.toString() }
        });
        user.stripeCustomerId = customer.id;
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId,
      });

      // Get payment method details
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

      // Add to user's payment methods
      const newPaymentMethod = {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          expMonth: paymentMethod.card.exp_month,
          expYear: paymentMethod.card.exp_year
        } : null,
        isDefault
      };

      if (isDefault) {
        // Set all other methods as non-default
        user.paymentMethods.forEach(pm => pm.isDefault = false);
      }

      user.paymentMethods = user.paymentMethods || [];
      user.paymentMethods.push(newPaymentMethod);
      
      await user.save();

      res.json({
        success: true,
        message: 'Payment method added successfully',
        paymentMethod: newPaymentMethod
      });

    } catch (error) {
      console.error('Add payment method error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add payment method',
        error: error.message
      });
    }
  },

  // Remove payment method
  removePaymentMethod: async (req, res) => {
    try {
      const { paymentMethodId } = req.params;

      // Detach from Stripe
      await stripe.paymentMethods.detach(paymentMethodId);

      // Remove from user's payment methods
      const user = await User.findById(req.user.id);
      user.paymentMethods = user.paymentMethods.filter(
        pm => pm.id !== paymentMethodId
      );
      
      await user.save();

      res.json({
        success: true,
        message: 'Payment method removed successfully'
      });

    } catch (error) {
      console.error('Remove payment method error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove payment method',
        error: error.message
      });
    }
  },

  // Process refund
  processRefund: async (req, res) => {
    try {
      const { orderId, amount, reason } = req.body;

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      let refund;
      const refundAmount = amount || order.totalAmount;

      if (order.paymentDetails.gateway === 'stripe') {
        refund = await stripe.refunds.create({
          payment_intent: order.paymentDetails.transactionId,
          amount: refundAmount * 100,
          reason: reason || 'requested_by_customer'
        });
      } else if (order.paymentDetails.gateway === 'razorpay') {
        refund = await razorpay.payments.refund(
          order.paymentDetails.transactionId,
          {
            amount: refundAmount * 100,
            notes: { reason: reason || 'Customer refund request' }
          }
        );
      }

      // Update order with refund details
      order.refunds = order.refunds || [];
      order.refunds.push({
        amount: refundAmount,
        reason,
        refundId: refund.id,
        status: refund.status,
        processedAt: new Date()
      });

      if (refundAmount >= order.totalAmount) {
        order.status = 'refunded';
      } else {
        order.status = 'partially_refunded';
      }

      await order.save();

      res.json({
        success: true,
        message: 'Refund processed successfully',
        refund,
        order
      });

    } catch (error) {
      console.error('Refund processing error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process refund',
        error: error.message
      });
    }
  },

  // Get payment history
  getPaymentHistory: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const orders = await Order.find({ 
        user: req.user.id,
        paymentStatus: 'completed'
      })
      .populate('items.product', 'name images')
      .sort({ paidAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

      const total = await Order.countDocuments({ 
        user: req.user.id,
        paymentStatus: 'completed'
      });

      res.json({
        success: true,
        payments: orders,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      });

    } catch (error) {
      console.error('Payment history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment history',
        error: error.message
      });
    }
  }
};

module.exports = paymentController;