const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  type: {
    type: String,
    enum: [
      'order_placed', 'order_confirmed', 'order_shipped', 'order_delivered',
      'bargain_received', 'bargain_accepted', 'bargain_rejected', 'bargain_countered',
      'payment_received', 'payment_failed', 'refund_processed',
      'product_out_of_stock', 'new_review', 'support_response',
      'promotion', 'system_update'
    ],
    required: [true, 'Notification type is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  data: mongoose.Schema.Types.Mixed, // Additional data like order ID, product ID etc.
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'sms', 'push']
  }],
  sentChannels: [{
    channel: {
      type: String,
      enum: ['in_app', 'email', 'sms', 'push']
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed']
    },
    response: mongoose.Schema.Types.Mixed
  }],
  expiresAt: Date,
  actionUrl: String, // URL to navigate when notification is clicked
  imageUrl: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
notificationSchema.index({ userId: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 });

// Mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Check if expired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

module.exports = mongoose.model('Notification', notificationSchema);