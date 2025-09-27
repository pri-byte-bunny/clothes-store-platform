const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  targetType: {
    type: String,
    enum: ['product', 'store', 'order'],
    required: [true, 'Target type is required']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Target ID is required']
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  images: [String],
  pros: [String],
  cons: [String],
  isVerifiedPurchase: {
    type: Boolean,
    default: false
  },
  helpfulVotes: {
    type: Number,
    default: 0
  },
  totalVotes: {
    type: Number,
    default: 0
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  hiddenReason: String,
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sellerResponse: {
    message: String,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
reviewSchema.index({ userId: 1 });
reviewSchema.index({ targetType: 1, targetId: 1 });
reviewSchema.index({ orderId: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isVerifiedPurchase: 1 });
reviewSchema.index({ createdAt: -1 });

// Compound index for unique review per user per target
reviewSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

// Virtual for helpfulness percentage
reviewSchema.virtual('helpfulnessPercentage').get(function() {
  if (this.totalVotes === 0) return 0;
  return Math.round((this.helpfulVotes / this.totalVotes) * 100);
});

// Mark as helpful/unhelpful
reviewSchema.methods.vote = function(isHelpful) {
  this.totalVotes += 1;
  if (isHelpful) {
    this.helpfulVotes += 1;
  }
  return this.save();
};

// Add seller response
reviewSchema.methods.addSellerResponse = function(message, sellerId) {
  this.sellerResponse = {
    message,
    respondedAt: new Date(),
    respondedBy: sellerId
  };
  return this.save();
};

module.exports = mongoose.model('Review', reviewSchema);
