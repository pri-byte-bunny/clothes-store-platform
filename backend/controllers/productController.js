const Product = require('../models/Product');
const Store = require('../models/Store');
const { buildPaginationResponse, parsePaginationParams } = require('../utils/helpers');

// Add new product
exports.addProduct = async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can add products'
      });
    }

    // Verify store ownership
    const store = await Store.findOne({
      _id: req.body.storeId,
      sellerId: req.user._id
    });

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have permission'
      });
    }

    const productData = {
      ...req.body,
      sellerId: req.user._id
    };

    const product = new Product(productData);
    await product.save();

    await product.populate('storeId', 'storeName');

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product
    });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add product',
      error: error.message
    });
  }
};

// Get products by store
exports.getProductsByStore = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { category, minPrice, maxPrice, sortBy = 'createdAt' } = req.query;

    // Build filter
    const filter = {
      storeId: req.params.storeId,
      isActive: true
    };

    if (category) {
      filter.category = category;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Build sort
    let sort = {};
    switch (sortBy) {
      case 'price_low':
        sort = { price: 1 };
        break;
      case 'price_high':
        sort = { price: -1 };
        break;
      case 'rating':
        sort = { rating: -1 };
        break;
      case 'name':
        sort = { name: 1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('sellerId', 'name')
        .lean(),
      Product.countDocuments(filter)
    ]);

    const response = buildPaginationResponse(products, total, page, limit);

    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('Get products by store error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

// Get single product
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('sellerId', 'name phone')
      .populate('storeId', 'storeName address contactNumber businessHours')
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
};

// Search products
exports.searchProducts = async (req, res) => {
  try {
    const { page, limit, skip } = parsePaginationParams(req.query);
    const { 
      q, 
      category, 
      minPrice, 
      maxPrice, 
      latitude, 
      longitude, 
      radius = 10,
      sortBy = 'relevance'
    } = req.query;

    let pipeline = [];

    // Text search
    if (q) {
      pipeline.push({
        $match: {
          $text: { $search: q },
          isActive: true
        }
      });
      pipeline.push({
        $addFields: {
          score: { $meta: 'textScore' }
        }
      });
    } else {
      pipeline.push({
        $match: { isActive: true }
      });
    }

    // Category filter
    if (category) {
      pipeline.push({
        $match: { category }
      });
    }

    // Price filter
    if (minPrice || maxPrice) {
      const priceMatch = {};
      if (minPrice) priceMatch.$gte = parseFloat(minPrice);
      if (maxPrice) priceMatch.$lte = parseFloat(maxPrice);
      pipeline.push({
        $match: { price: priceMatch }
      });
    }

    // Location filter
    if (latitude && longitude) {
      pipeline.push({
        $lookup: {
          from: 'stores',
          localField: 'storeId',
          foreignField: '_id',
          as: 'store'
        }
      });
      pipeline.push({
        $match: {
          'store.address.coordinates': {
            $geoWithin: {
              $centerSphere: [
                [parseFloat(longitude), parseFloat(latitude)],
                radius / 6371 // Convert km to radians
              ]
            }
          }
        }
      });
    }

    // Populate store and seller info
    pipeline.push({
      $lookup: {
        from: 'stores',
        localField: 'storeId',
        foreignField: '_id',
        as: 'store',
        pipeline: [{ $project: { storeName: 1, address: 1 } }]
      }
    });
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'sellerId',
        foreignField: '_id',
        as: 'seller',
        pipeline: [{ $project: { name: 1 } }]
      }
    });
    pipeline.push({
      $addFields: {
        store: { $arrayElemAt: ['$store', 0] },
        seller: { $arrayElemAt: ['$seller', 0] }
      }
    });

    // Sorting
    let sortStage = {};
    switch (sortBy) {
      case 'price_low':
        sortStage = { price: 1 };
        break;
      case 'price_high':
        sortStage = { price: -1 };
        break;
      case 'rating':
        sortStage = { rating: -1 };
        break;
      case 'newest':
        sortStage = { createdAt: -1 };
        break;
      case 'relevance':
        if (q) {
          sortStage = { score: { $meta: 'textScore' } };
        } else {
          sortStage = { createdAt: -1 };
        }
        break;
      default:
        sortStage = { createdAt: -1 };
    }
    pipeline.push({ $sort: sortStage });

    // Pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const [products, totalResult] = await Promise.all([
      Product.aggregate(pipeline),
      Product.aggregate([
        ...pipeline.slice(0, -2), // Remove skip and limit
        { $count: 'total' }
      ])
    ]);

    const total = totalResult[0]?.total || 0;
    const response = buildPaginationResponse(products, total, page, limit);

    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search products',
      error: error.message
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      sellerId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission'
      });
    }

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        product[key] = req.body[key];
      }
    });

    await product.save();
    await product.populate('storeId', 'storeName');

    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      sellerId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission'
      });
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

// Get seller's products
exports.getMyProducts = async (req, res) => {
  try {
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        success: false,
        message: 'Only sellers can access this endpoint'
      });
    }

    const { page, limit, skip } = parsePaginationParams(req.query);
    const { status = 'all', storeId } = req.query;

    const filter = { sellerId: req.user._id };
    
    if (status !== 'all') {
      filter.isActive = status === 'active';
    }
    
    if (storeId) {
      filter.storeId = storeId;
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('storeId', 'storeName')
        .lean(),
      Product.countDocuments(filter)
    ]);

    const response = buildPaginationResponse(products, total, page, limit);

    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('Get my products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

// Upload product images
exports.uploadProductImages = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      sellerId: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or you do not have permission'
      });
    }

    const imageUrls = req.files.map(file => file.filename);
    product.images = [...product.images, ...imageUrls];
    await product.save();

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      images: imageUrls
    });
  } catch (error) {
    console.error('Upload product images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
};

// Get featured products
exports.getFeaturedProducts = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const products = await Product.find({
      isActive: true,
      isFeatured: true
    })
    .sort({ rating: -1, totalSold: -1 })
    .limit(parseInt(limit))
    .populate('sellerId', 'name')
    .populate('storeId', 'storeName')
    .lean();

    res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured products',
      error: error.message
    });
  }
};