const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller ID is required']
  },
  storeName: {
    type: String,
    required: [true, 'Store name is required'],
    trim: true,
    minlength: [2, 'Store name must be at least 2 characters'],
    maxlength: [100, 'Store name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    enum: ['fashion', 'electronics', 'home', 'sports', 'books', 'beauty', 'food', 'other'],
    default: 'fashion'
  },
  subcategories: [String],
  address: {
    street: { type: String, required: true, trim: true },
    area: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, match: /^\d{6}$/ },
    country: { type: String, default: 'India' },
    coordinates: {
      latitude: { type: Number, required: true, min: -90, max: 90 },
      longitude: { type: Number, required: true, min: -180, max: 180 }
    },
    landmark: String,
    formattedAddress: String
  },
  contact: {
    phone: { type: String, match: /^\d{10}$/ },
    alternatePhone: { type: String, match: /^\d{10}$/ },
    email: { type: String, match: /^\S+@\S+\.\S+$/ },
    website: String,
    whatsapp: { type: String, match: /^\d{10}$/ }
  },
  businessHours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: true } }
  },
  media: {
    logo: String,
    banner: String,
    storeImages: [String],
    videos: [String]
  },
  verification: {
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verificationDocuments: [String],
    gstNumber: String,
    businessLicense: String
  },
  metrics: {
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalRatings: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    responseTime: { type: Number, default: 0 }, // in hours
    fulfillmentRate: { type: Number, default: 0 } // percentage
  },
  settings: {
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    acceptsReturns: { type: Boolean, default: true },
    returnPolicy: { type: String, default: '7 days return policy' },
    shippingPolicy: String,
    minOrderAmount: { type: Number, default: 0 },
    freeShippingAbove: { type: Number, default: 500 },
    deliveryAreas: [String],
    paymentMethods: [{
      type: String,
      enum: ['cod', 'card', 'upi', 'netbanking', 'wallet']
    }]
  },
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    youtube: String,
    linkedin: String
  },
  tags: [String],
  specialOffers: [{
    title: String,
    description: String,
    discountPercentage: Number,
    validUntil: Date,
    isActive: { type: Boolean, default: true }
  }],
  followers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  metadata: {
    lastActive: { type: Date, default: Date.now },
    totalViews: { type: Number, default: 0 },
    monthlyViews: { type: Number, default: 0 },
    source: String // how the store was created
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
storeSchema.index({ sellerId: 1 });
storeSchema.index({ 'address.coordinates': '2dsphere' });
storeSchema.index({ storeName: 'text', description: 'text', tags: 'text' });
storeSchema.index({ slug: 1 });
storeSchema.index({ category: 1 });
storeSchema.index({ 'metrics.rating': -1 });
storeSchema.index({ 'settings.isActive': 1, 'verification.isVerified': 1 });
storeSchema.index({ 'settings.isFeatured': 1 });

// Generate slug before saving
storeSchema.pre('save', function(next) {
  if (this.isModified('storeName') && !this.slug) {
    this.slug = this.storeName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Update last active on any modification
storeSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.metadata.lastActive = new Date();
  }
  next();
});

// Virtual for average rating
storeSchema.virtual('averageRating').get(function() {
  return this.metrics.totalRatings > 0 ? 
    Math.round((this.metrics.rating / this.metrics.totalRatings) * 10) / 10 : 0;
});

// Virtual for follower count
storeSchema.virtual('followerCount').get(function() {
  return this.followers ? this.followers.length : 0;
});

// Virtual for is open now
storeSchema.virtual('isOpenNow').get(function() {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  const currentTime = now.toTimeString().slice(0, 5);
  
  const todayHours = this.businessHours[day];
  if (!todayHours || todayHours.closed) return false;
  
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
});

// Update rating method
storeSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.metrics.rating * this.metrics.totalRatings;
  this.metrics.totalRatings += 1;
  this.metrics.rating = (currentTotal + newRating) / this.metrics.totalRatings;
  return this.save();
};

// Add follower method
storeSchema.methods.addFollower = function(userId) {
  if (!this.followers.includes(userId)) {
    this.followers.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

// Remove follower method
storeSchema.methods.removeFollower = function(userId) {
  this.followers = this.followers.filter(id => !id.equals(userId));
  return this.save();
};

// Check if user is follower
storeSchema.methods.isFollowedBy = function(userId) {
  return this.followers.some(id => id.equals(userId));
};

// Update metrics
storeSchema.methods.updateMetrics = function(metrics) {
  Object.keys(metrics).forEach(key => {
    if (this.metrics[key] !== undefined) {
      this.metrics[key] = metrics[key];
    }
  });
  return this.save();
};

module.exports = mongoose.model('Store', storeSchema);
