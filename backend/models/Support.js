const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  ticketNumber: {
    type: String,
    unique: true,
    required: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    enum: ['order', 'payment', 'technical', 'account', 'product', 'general'],
    required: [true, 'Category is required']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'],
    default: 'open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }],
  responses: [{
    message: {
      type: String,
      required: true,
      maxlength: [2000, 'Response cannot exceed 2000 characters']
    },
    sender: {
      type: String,
      enum: ['customer', 'support'],
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    attachments: [{
      filename: String,
      originalName: String,
      url: String
    }]
  }],
  tags: [String],
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5
  },
  satisfactionComment: String,
  resolvedAt: Date,
  closedAt: Date,
  firstResponseAt: Date,
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  escalationLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  internalNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
supportSchema.index({ userId: 1 });
supportSchema.index({ ticketNumber: 1 });
supportSchema.index({ status: 1 });
supportSchema.index({ category: 1 });
supportSchema.index({ priority: 1 });
supportSchema.index({ assignedTo: 1 });
supportSchema.index({ createdAt: -1 });
supportSchema.index({ lastActivityAt: -1 });

// Generate ticket number before saving
supportSchema.pre('save', function(next) {
  if (this.isNew && !this.ticketNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    this.ticketNumber = `TKT${timestamp}${random}`;
  }
  next();
});

// Update last activity on any change
supportSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastActivityAt = new Date();
  }
  next();
});

// Virtual for response time (first response)
supportSchema.virtual('responseTime').get(function() {
  if (!this.firstResponseAt) return null;
  return this.firstResponseAt - this.createdAt;
});

// Virtual for resolution time
supportSchema.virtual('resolutionTime').get(function() {
  if (!this.resolvedAt) return null;
  return this.resolvedAt - this.createdAt;
});

// Add response method
supportSchema.methods.addResponse = function(message, sender, senderId, attachments = []) {
  this.responses.push({
    message,
    sender,
    senderId,
    attachments
  });
  
  // Set first response time if this is the first support response
  if (sender === 'support' && !this.firstResponseAt) {
    this.firstResponseAt = new Date();
  }
  
  this.lastActivityAt = new Date();
  return this.save();
};

// Change status method
supportSchema.methods.changeStatus = function(newStatus, userId) {
  this.status = newStatus;
  
  if (newStatus === 'resolved') {
    this.resolvedAt = new Date();
  } else if (newStatus === 'closed') {
    this.closedAt = new Date();
  }
  
  this.lastActivityAt = new Date();
  return this.save();
};

// Escalate ticket
supportSchema.methods.escalate = function(reason, escalatedBy) {
  this.escalationLevel = Math.min(this.escalationLevel + 1, 3);
  this.priority = this.escalationLevel >= 2 ? 'high' : 'medium';
  
  this.internalNotes.push({
    note: `Ticket escalated to level ${this.escalationLevel}. Reason: ${reason}`,
    addedBy: escalatedBy
  });
  
  return this.save();
};

module.exports = mongoose.model('Support', supportSchema);
