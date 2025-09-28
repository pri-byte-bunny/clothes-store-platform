 // Validation rules for// models/Order.js (Complete version)
const mongoose = require('mongoose');
const { generateUniqueId } = require('../utils/helpers');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Buyer ID is required']
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller ID is required']
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: [true, 'Store ID is required']
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    size: String,
    color: String,
    images: [String],
    specifications: [{
      name: String,
      value: String
    }]
  }],
  pricing: {
    subtotal: { type: Number, required: true, min: 0 },
    platformFee: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxes: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    sellerAmount: { type: Number, required: true, min: 0 }
  },
  shippingAddress: {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, match: /^\d{10}$/ },
    email: { type: String, match: /^\S+@\S+\.\S+$/ },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, match: /^\d{6}$/ },
    landmark: { type: String, trim: true },
    addressType: { 
      type: String, 
      enum: ['home', 'work', 'other'], 
      default: 'home' 
    }
  },
  paymentDetails: {
    method: {
      type: String,
      enum: ['card', 'upi', 'netbanking', 'wallet', 'cod'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partial_refund'],
      default: 'pending'
    },
    transactionId: String,
    paymentId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    paidAt: Date,
    refundDetails: {
      amount: Number,
      reason: String,
      refundId: String,
      refundedAt: Date
    }
  },
  orderStatus: {
    type: String,
    enum: ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    default: 'placed'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned']
    },
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    location: String
  }],
  shipping: {
    trackingNumber: String,
    courier: String,
    courierUrl: String,
    estimatedDelivery: Date,
    actualDelivery: Date,
    shippingCharges: { type: Number, default: 0 },
    weight: Number, // in grams
    dimensions: {
      length: Number, // in cm
      width: Number,
      height: Number
    }
  },
  timeline: {
    placedAt: { type: Date, default: Date.now },
    confirmedAt: Date,
    packedAt: Date,
    shippedAt: Date,
    outForDeliveryAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    returnedAt: Date
  },
  cancellation: {
    reason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    refundAmount: Number
  },
  return: {
    reason: String,
    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    returnStatus: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'picked_up', 'completed']
    },
    returnedItems: [{
      productId: mongoose.Schema.Types.ObjectId,
      quantity: Number,
      reason: String
    }],
    refundAmount: Number
  },
  rating: {
    overall: { type: Number, min: 1, max: 5 },
    delivery: { type: Number, min: 1, max: 5 },
    packaging: { type: Number, min: 1, max: 5 },
    comment: String,
    ratedAt: Date
  },
  notes: {
    buyer: String,
    seller: String,
    admin: String
  },
  metadata: {
    source: { type: String, default: 'web' }, // web, mobile, api
    userAgent: String,
    ipAddress: String,
    sessionId: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, orderStatus: 1 });
orderSchema.index({ storeId: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ 'paymentDetails.status': 1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ 'timeline.placedAt': -1 });

// Generate order number before saving
orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = generateUniqueId('ORD');
  }
  next();
});

// Calculate totals before saving
orderSchema.pre('save', function(next) {
  if (this.isModified('products') || this.isModified('pricing')) {
    // Calculate subtotal
    this.pricing.subtotal = this.products.reduce((sum, product) => {
      return sum + (product.price * product.quantity);
    }, 0);

    // Calculate total amount
    this.pricing.totalAmount = 
      this.pricing.subtotal + 
      this.pricing.platformFee + 
      this.pricing.deliveryFee + 
      this.pricing.taxes - 
      this.pricing.discount;

    // Calculate seller amount
    this.pricing.sellerAmount = this.pricing.subtotal - this.pricing.platformFee;
  }
  next();
});

// Virtual for order age
orderSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Virtual for delivery status
orderSchema.virtual('deliveryStatus').get(function() {
  if (this.orderStatus === 'delivered') return 'delivered';
  if (this.orderStatus === 'cancelled') return 'cancelled';
  if (this.shipping.estimatedDelivery) {
    return new Date() > this.shipping.estimatedDelivery ? 'delayed' : 'on_time';
  }
  return 'unknown';
});

// Virtual for can cancel
orderSchema.virtual('canCancel').get(function() {
  if (!['placed', 'confirmed'].includes(this.orderStatus)) return false;
  
  // Check time limit (1 hour)
  const hoursSinceOrder = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  return hoursSinceOrder <= 1;
});

// Virtual for can return
orderSchema.virtual('canReturn').get(function() {
  if (this.orderStatus !== 'delivered') return false;
  
  // Check return window (7 days)
  const daysSinceDelivery = (Date.now() - this.timeline.deliveredAt) / (1000 * 60 * 60 * 24);
  return daysSinceDelivery <= 7;
});

// Update status method
orderSchema.methods.updateStatus = function(newStatus, note = '', updatedBy = null, location = '') {
  // Update main status
  this.orderStatus = newStatus;
  
  // Update timeline
  const statusField = `${newStatus}At`;
  if (this.timeline.hasOwnProperty(statusField)) {
    this.timeline[statusField] = new Date();
  }
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy,
    location
  });
  
  return this.save();
};

// Calculate delivery time
orderSchema.methods.getDeliveryTime = function() {
  if (this.timeline.deliveredAt && this.timeline.placedAt) {
    return this.timeline.deliveredAt - this.timeline.placedAt;
  }
  return null;
};

// Get current status info
orderSchema.methods.getCurrentStatusInfo = function() {
  const statusMap = {
    placed: { label: 'Order Placed', description: 'Your order has been placed successfully' },
    confirmed: { label: 'Order Confirmed', description: 'Seller has confirmed your order' },
    packed: { label: 'Order Packed', description: 'Your order has been packed' },
    shipped: { label: 'Order Shipped', description: 'Your order is on the way' },
    out_for_delivery: { label: 'Out for Delivery', description: 'Your order is out for delivery' },
    delivered: { label: 'Delivered', description: 'Your order has been delivered' },
    cancelled: { label: 'Cancelled', description: 'Your order has been cancelled' },
    returned: { label: 'Returned', description: 'Your order has been returned' }
  };
  
  return statusMap[this.orderStatus] || { label: 'Unknown', description: 'Status unknown' };
};

module.exports = mongoose.model('Order', orderSchema);
