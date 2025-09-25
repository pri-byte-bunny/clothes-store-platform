const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clothesstore', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['buyer', 'seller'], required: true },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Store Schema
const storeSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  storeName: { type: String, required: true },
  description: String,
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    }
  },
  contactNumber: String,
  storeImages: [String],
  isActive: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  totalRatings: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Product Schema
const productSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  name: { type: String, required: true },
  description: String,
  category: { type: String, required: true },
  subcategory: String,
  price: { type: Number, required: true },
  discountPrice: Number,
  sizes: [String],
  colors: [String],
  images: [String],
  stock: { type: Number, default: 1 },
  isBargainable: { type: Boolean, default: true },
  minPrice: Number, // Minimum price for bargaining
  tags: [String],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// Bargain Schema
const bargainSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalPrice: { type: Number, required: true },
  proposedPrice: { type: Number, required: true },
  counterOffer: Number,
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'countered'], default: 'pending' },
  messages: [{
    sender: { type: String, enum: ['buyer', 'seller'] },
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

// Order Schema
const orderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  products: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    price: Number,
    size: String,
    color: String
  }],
  totalAmount: { type: Number, required: true },
  platformFee: { type: Number, default: 0 },
  sellerAmount: { type: Number, required: true },
  shippingAddress: {
    name: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  paymentMethod: { type: String, required: true },
  paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  paymentId: String,
  orderStatus: { type: String, enum: ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'], default: 'placed' },
  deliveryDate: Date,
  createdAt: { type: Date, default: Date.now }
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  platformFee: { type: Number, default: 0 },
  netAmount: { type: Number, required: true },
  status: { type: String, enum: ['held', 'transferred', 'failed'], default: 'held' },
  transferDate: Date,
  transactionId: String,
  createdAt: { type: Date, default: Date.now }
});

// Support Ticket Schema
const supportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['order', 'payment', 'technical', 'general'], required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  attachments: [String],
  responses: [{
    message: String,
    sender: { type: String, enum: ['user', 'support'] },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Store = mongoose.model('Store', storeSchema);
const Product = mongoose.model('Product', productSchema);
const Bargain = mongoose.model('Bargain', bargainSchema);
const Order = mongoose.model('Order', orderSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Support = mongoose.model('Support', supportSchema);

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// AUTH ROUTES

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, address } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      role,
      address
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// STORE ROUTES

// Create store (sellers only)
app.post('/api/stores', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Only sellers can create stores' });
    }

    const store = new Store({
      sellerId: req.user.userId,
      ...req.body
    });

    await store.save();
    res.status(201).json({ message: 'Store created successfully', store });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get stores by location
app.get('/api/stores/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    const stores = await Store.aggregate([
      {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          distanceField: 'distance',
          maxDistance: radius * 1000, // Convert km to meters
          spherical: true
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'sellerId',
          foreignField: '_id',
          as: 'seller'
        }
      },
      {
        $project: {
          storeName: 1,
          description: 1,
          address: 1,
          contactNumber: 1,
          storeImages: 1,
          rating: 1,
          totalRatings: 1,
          distance: 1,
          seller: { name: 1, phone: 1 }
        }
      }
    ]);

    res.json(stores);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PRODUCT ROUTES

// Add product (sellers only)
app.post('/api/products', verifyToken, upload.array('images', 5), async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({ message: 'Only sellers can add products' });
    }

    const images = req.files ? req.files.map(file => file.filename) : [];

    const product = new Product({
      sellerId: req.user.userId,
      ...req.body,
      images
    });

    await product.save();
    res.status(201).json({ message: 'Product added successfully', product });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get products by store
app.get('/api/products/store/:storeId', async (req, res) => {
  try {
    const products = await Product.find({
      storeId: req.params.storeId,
      isActive: true
    }).populate('sellerId', 'name');

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search products
app.get('/api/products/search', async (req, res) => {
  try {
    const { query, category, minPrice, maxPrice, latitude, longitude, radius = 10 } = req.query;

    let searchFilter = { isActive: true };

    if (query) {
      searchFilter.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ];
    }

    if (category) {
      searchFilter.category = category;
    }

    if (minPrice || maxPrice) {
      searchFilter.price = {};
      if (minPrice) searchFilter.price.$gte = parseFloat(minPrice);
      if (maxPrice) searchFilter.price.$lte = parseFloat(maxPrice);
    }

    let products = await Product.find(searchFilter)
      .populate('sellerId', 'name')
      .populate('storeId', 'storeName address');

    // Filter by location if coordinates provided
    if (latitude && longitude) {
      products = products.filter(product => {
        if (!product.storeId.address.coordinates) return false;
        
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          product.storeId.address.coordinates.latitude,
          product.storeId.address.coordinates.longitude
        );
        
        return distance <= parseFloat(radius);
      });
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// BARGAIN ROUTES

// Create bargain request
app.post('/api/bargains', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can make bargain requests' });
    }

    const { productId, proposedPrice } = req.body;
    
    const product = await Product.findById(productId);
    if (!product || !product.isBargainable) {
      return res.status(400).json({ message: 'Product not available for bargaining' });
    }

    const bargain = new Bargain({
      productId,
      buyerId: req.user.userId,
      sellerId: product.sellerId,
      originalPrice: product.price,
      proposedPrice
    });

    await bargain.save();
    res.status(201).json({ message: 'Bargain request sent', bargain });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Respond to bargain (sellers only)
app.put('/api/bargains/:bargainId', verifyToken, async (req, res) => {
  try {
    const { status, counterOffer, message } = req.body;
    
    const bargain = await Bargain.findById(req.params.bargainId);
    if (!bargain) {
      return res.status(404).json({ message: 'Bargain not found' });
    }

    if (bargain.sellerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    bargain.status = status;
    if (counterOffer) bargain.counterOffer = counterOffer;
    
    if (message) {
      bargain.messages.push({
        sender: 'seller',
        message
      });
    }

    await bargain.save();
    res.json({ message: 'Bargain updated', bargain });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ORDER ROUTES

// Create order
app.post('/api/orders', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return res.status(403).json({ message: 'Only buyers can place orders' });
    }

    const { products, shippingAddress, paymentMethod } = req.body;
    
    let totalAmount = 0;
    const orderProducts = [];

    for (let item of products) {
      const product = await Product.findById(item.productId);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ message: `Product ${product.name} not available` });
      }
      
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      
      orderProducts.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        size: item.size,
        color: item.color
      });
    }

    const platformFee = totalAmount * 0.05; // 5% platform fee
    const sellerAmount = totalAmount - platformFee;

    const order = new Order({
      buyerId: req.user.userId,
      sellerId: products[0].sellerId, // Assuming single seller per order
      products: orderProducts,
      totalAmount,
      platformFee,
      sellerAmount,
      shippingAddress,
      paymentMethod
    });

    await order.save();

    // Create transaction record
    const transaction = new Transaction({
      orderId: order._id,
      sellerId: products[0].sellerId,
      amount: totalAmount,
      platformFee,
      netAmount: sellerAmount
    });

    await transaction.save();

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user orders
app.get('/api/orders/my', verifyToken, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'buyer') {
      query.buyerId = req.user.userId;
    } else {
      query.sellerId = req.user.userId;
    }

    const orders = await Order.find(query)
      .populate('products.productId', 'name images')
      .populate('buyerId', 'name phone')
      .populate('sellerId', 'name phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// SUPPORT ROUTES

// Create support ticket
app.post('/api/support', verifyToken, async (req, res) => {
  try {
    const support = new Support({
      userId: req.user.userId,
      ...req.body
    });

    await support.save();
    res.status(201).json({ message: 'Support ticket created', support });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user support tickets
app.get('/api/support/my', verifyToken, async (req, res) => {
  try {
    const tickets = await Support.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PAYMENT ROUTES (Mock implementation)

// Process payment
app.post('/api/payment/process', verifyToken, async (req, res) => {
  try {
    const { orderId, paymentMethod, paymentDetails } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Mock payment processing
    const paymentId = 'pay_' + Math.random().toString(36).substr(2, 9);
    
    order.paymentStatus = 'completed';
    order.paymentId = paymentId;
    order.orderStatus = 'confirmed';
    
    await order.save();

    res.json({
      message: 'Payment processed successfully',
      paymentId,
      status: 'completed'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Daily settlement job (transfer funds to sellers)
app.post('/api/admin/settle-payments', async (req, res) => {
  try {
    const pendingTransactions = await Transaction.find({ status: 'held' });
    
    for (let transaction of pendingTransactions) {
      // Mock transfer to seller account
      transaction.status = 'transferred';
      transaction.transferDate = new Date();
      transaction.transactionId = 'txn_' + Math.random().toString(36).substr(2, 9);
      
      await transaction.save();
    }

    res.json({
      message: `Settled ${pendingTransactions.length} transactions`,
      count: pendingTransactions.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Utility function to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});