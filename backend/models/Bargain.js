const mongoose = require('mongoose');

const bargainSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product ID is required']
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
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [0, 'Price cannot be negative']
  },
  proposedPrice: {
    type: Number,
    required: [true, 'Proposed price is required'],
    min: [0, 'Price cannot be negative']
  },
  counterOffer: {
    type: Number,
    min: [0, 'Counter offer cannot be negative']
  },
  finalPrice: {
    type: Number,
    min: [0, 'Final price cannot be negative']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'countered', 'expired'],
    default: 'pending'
  },
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Quantity must be at least 1']
  },
  selectedSize: String,
  selectedColor: String,
  messages: [{
    sender: {
      type: String,
      enum: ['buyer', 'seller'],
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: [500, 'Message cannot exceed 500 characters']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    }
  },
  acceptedAt: Date,
  rejectedAt: Date,
  rejectionReason: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
bargainSchema.index({ productId: 1 });
bargainSchema.index({ buyerId: 1 });
bargainSchema.index({ sellerId: 1 });
bargainSchema.index({ status: 1 });
bargainSchema.index({ expiresAt: 1 });
bargainSchema.index({ createdAt: -1 });

// Virtual for discount percentage
bargainSchema.virtual('discountPercentage').get(function() {
  const price = this.finalPrice || this.counterOffer || this.proposedPrice;
  return Math.round(((this.originalPrice - price) / this.originalPrice) * 100);
});

// Virtual for time remaining
bargainSchema.virtual('timeRemaining').get(function() {
  if (this.status !== 'pending' && this.status !== 'countered') return 0;
  const now = new Date();
  const remaining = this.expiresAt - now;
  return Math.max(0, remaining);
});

// Auto-expire bargains
bargainSchema.methods.checkExpiry = function() {
  if (this.status === 'pending' || this.status === 'countered') {
    if (new Date() > this.expiresAt) {
      this.status = 'expired';
      return this.save();
    }
  }
  return Promise.resolve(this);
};

// Accept bargain
bargainSchema.methods.accept = function(acceptedBy) {
  this.status = 'accepted';
  this.acceptedAt = new Date();
  this.finalPrice = this.counterOffer || this.proposedPrice;
  return this.save();
};

// Reject bargain
bargainSchema.methods.reject = function(reason) {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Add message
bargainSchema.methods.addMessage = function(sender, message) {
  this.messages.push({ sender, message });
  return this.save();
};

module.exports = mongoose.model('Bargain', bargainSchema);
