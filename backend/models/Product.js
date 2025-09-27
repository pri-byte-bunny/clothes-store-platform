const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [2, 'Product name must be at least 2 characters'],
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  subcategory: { type: String, trim: true },
  brand: { type: String, trim: true },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  discountPrice: {
    type: Number,
    min: [0, 'Discount price cannot be negative'],
    validate: {
      validator: function(value) {
        return !value || value < this.price;
      },
      message: 'Discount price must be less than original price'
    }
  },
  sizes: [{ type: String, trim: true }],
  colors: [{ type: String, trim: true }],
  images: [{ type: String }],
  stock: {
    type: Number,
    default: 1,
    min: [0, 'Stock cannot be negative']
  },
  isBargainable: { type: Boolean, default: true },
  minPrice: {
    type: Number,
    min: [0, 'Minimum price cannot be negative'],
    validate: {
      validator: function(value) {
        return !value || value <= (this.discountPrice || this.price);
      },
      message: 'Minimum price must be less than or equal to selling price'
    }
  },
  tags: [String],
  specifications: [{
    name: { type: String, required: true },
    value: { type: String, required: true }
  }],
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  totalSold: { type: Number, default: 0 },
  weight: { type: Number }, // in grams
  dimensions: {
    length: Number, // in cm
    width: Number,
    height: Number
  },
  material: String,
  careInstructions: String,
  returnPolicy: { type: String, default: '7 days return policy' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
productSchema.index({ sellerId: 1 });
productSchema.index({ storeId: 1 });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ createdAt: -1 });

// Virtual for effective price
productSchema.virtual('effectivePrice').get(function() {
  return this.discountPrice || this.price;
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (!this.discountPrice) return 0;
  return Math.round(((this.price - this.discountPrice) / this.price) * 100);
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= 5) return 'low_stock';
  return 'in_stock';
});

// Update rating method
productSchema.methods.updateRating = function(newRating) {
  this.rating = ((this.rating * this.totalRatings) + newRating) / (this.totalRatings + 1);
  this.totalRatings += 1;
  return this.save();
};

// Reduce stock method
productSchema.methods.reduceStock = function(quantity) {
  if (this.stock < quantity) {
    throw new Error('Insufficient stock');
  }
  this.stock -= quantity;
  this.totalSold += quantity;
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);
