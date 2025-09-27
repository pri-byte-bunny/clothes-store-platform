const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required']
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller ID is required']
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Buyer ID is required']
  },
  transactionNumber: {
    type: String,
    unique: true,
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  platformFee: {
    type: Number,
    default: 0,
    min: [0, 'Platform fee cannot be negative']
  },
  processingFee: {
    type: Number,
    default: 0,
    min: [0, 'Processing fee cannot be negative']
  },
  netAmount: {
    type: Number,
    required: [true, 'Net amount is required'],
    min: [0, 'Net amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'upi', 'netbanking', 'wallet', 'cod'],
    required: true
  },
  paymentGateway: {
    type: String,
    enum: ['razorpay', 'stripe', 'paytm', 'phonepe', 'googlepay']
  },
  gatewayTransactionId: String,
  gatewayResponse: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['pending', 'processing', 'held', 'transferred', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  transferDate: Date,
  transferId: String,
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String
  },
  refundDetails: {
    refundId: String,
    refundAmount: Number,
    refundDate: Date,
    refundReason: String
  },
  settlementBatch: String,
  notes: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
transactionSchema.index({ orderId: 1 });
transactionSchema.index({ sellerId: 1 });
transactionSchema.index({ buyerId: 1 });
transactionSchema.index({ transactionNumber: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ transferDate: 1 });

// Generate transaction number before saving
transactionSchema.pre('save', function(next) {
  if (this.isNew && !this.transactionNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.transactionNumber = `TXN${timestamp}${random}`;
  }
  next();
});

// Calculate net amount before saving
transactionSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('platformFee') || this.isModified('processingFee')) {
    this.netAmount = this.amount - this.platformFee - this.processingFee;
  }
  next();
});

// Mark as transferred
transactionSchema.methods.markTransferred = function(transferId) {
  this.status = 'transferred';
  this.transferDate = new Date();
  this.transferId = transferId;
  return this.save();
};

// Process refund
transactionSchema.methods.processRefund = function(refundAmount, refundReason) {
  this.status = 'refunded';
  this.refundDetails = {
    refundAmount: refundAmount || this.amount,
    refundDate: new Date(),
    refundReason
  };
  return this.save();
};

module.exports = mongoose.model('Transaction', transactionSchema);
