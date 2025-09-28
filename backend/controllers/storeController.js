const Store = require('../models/Store');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { imageHelpers } = require('../config/cloudinary');

const storeController = {
  // Create a new store
  createStore: async (req, res) => {
    try {
      const {
        name,
        description,
        address,
        phone,
        email,
        category,
        workingHours,
        socialMedia
      } = req.body;

      // Check if user already has a store
      const existingStore = await Store.findOne({ owner: req.user.id });
      if (existingStore) {
        return res.status(400).json({
          success: false,
          message: 'You already have a store. Please update existing store instead.'
        });
      }

      // Process store logo if uploaded
      let logo = null;
      if (req.file) {
        const uploadedImage = await imageHelpers.processSingleUpload(req.file);
        logo = {
          url: uploadedImage.url,
          publicId: uploadedImage.publicId
        };
      }

      const store = new Store({
        name,
        description,
        owner: req.user.id,
        contactInfo: {
          address,
          phone,
          email: email || req.user.email
        },
        category,
        logo,
        workingHours: workingHours || {
          monday: { open: '09:00', close: '18:00', isOpen: true },
          tuesday: { open: '09:00', close: '18:00', isOpen: true },
          wednesday: { open: '09:00', close: '18:00', isOpen: true },
          thursday: { open: '09:00', close: '18:00', isOpen: true },
          friday: { open: '09:00', close: '18:00', isOpen: true },
          saturday: { open: '10:00', close: '16:00', isOpen: true },
          sunday: { open: '10:00', close: '16:00', isOpen: false }
        },
        socialMedia: socialMedia || {}
      });

      await store.save();

      res.status(201).json({
        success: true,
        message: 'Store created successfully',
        store
      });

    } catch (error) {
      // Cleanup uploaded image if store creation fails
      if (req.file) {
        try {
          const uploadedImage = await imageHelpers.processSingleUpload(req.file);
          await imageHelpers.deleteImage(uploadedImage.publicId);
        } catch (cleanupError) {
          console.error('Error cleaning up image:', cleanupError);
        }
      }

      console.error('Store creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create store',
        error: error.message
      });
    }
  },

  // Get all stores (with filtering and pagination)
  getAllStores: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 12,
        category,
        search,
        location,
        isOpen,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      // Build filter object
      const filter = { isActive: true };

      if (category) {
        filter.category = category;
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      if (location) {
        filter['contactInfo.address.city'] = { $regex: location, $options: 'i' };
      }

      // Sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const stores = await Store.find(filter)
        .populate('owner', 'name email')
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .select('-__v');

      const total = await Store.countDocuments(filter);

      // Add product count and rating for each store
      const storesWithDetails = await Promise.all(
        stores.map(async (store) => {
          const productCount = await Product.countDocuments({ 
            store: store._id, 
            isActive: true 
          });
          
          return {
            ...store.toObject(),
            productCount,
            averageRating: store.averageRating || 0,
            totalReviews: store.reviews?.length || 0
          };
        })
      );

      res.json({
        success: true,
        stores: storesWithDetails,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      });

    } catch (error) {
      console.error('Get stores error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch stores',
        error: error.message
      });
    }
  },

  // Get store by ID
  getStoreById: async (req, res) => {
    try {
      const { id } = req.params;

      const store = await Store.findById(id)
        .populate('owner', 'name email createdAt')
        .populate({
          path: 'reviews.user',
          select: 'name avatar'
        });

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      // Get store products
      const products = await Product.find({ 
        store: store._id, 
        isActive: true 
      })
      .limit(8)
      .select('name price images category stock');

      // Get store statistics
      const totalProducts = await Product.countDocuments({ 
        store: store._id, 
        isActive: true 
      });
      
      const totalOrders = await Order.countDocuments({ 
        'items.product': { $in: await Product.find({ store: store._id }).distinct('_id') }
      });

      res.json({
        success: true,
        store: {
          ...store.toObject(),
          products,
          statistics: {
            totalProducts,
            totalOrders,
            averageRating: store.averageRating || 0,
            totalReviews: store.reviews?.length || 0
          }
        }
      });

    } catch (error) {
      console.error('Get store error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch store',
        error: error.message
      });
    }
  },

  // Get current user's store
  getMyStore: async (req, res) => {
    try {
      const store = await Store.findOne({ owner: req.user.id })
        .populate({
          path: 'reviews.user',
          select: 'name avatar'
        });

      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'You do not have a store yet'
        });
      }

      // Get store statistics
      const totalProducts = await Product.countDocuments({ 
        store: store._id 
      });
      
      const activeProducts = await Product.countDocuments({ 
        store: store._id, 
        isActive: true 
      });

      const totalOrders = await Order.countDocuments({ 
        'items.product': { $in: await Product.find({ store: store._id }).distinct('_id') }
      });

      const pendingOrders = await Order.countDocuments({ 
        'items.product': { $in: await Product.find({ store: store._id }).distinct('_id') },
        status: 'pending'
      });

      res.json({
        success: true,
        store: {
          ...store.toObject(),
          statistics: {
            totalProducts,
            activeProducts,
            totalOrders,
            pendingOrders,
            averageRating: store.averageRating || 0,
            totalReviews: store.reviews?.length || 0
          }
        }
      });

    } catch (error) {
      console.error('Get my store error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch your store',
        error: error.message
      });
    }
  },

  // Update store
  updateStore: async (req, res) => {
    try {
      const {
        name,
        description,
        address,
        phone,
        email,
        category,
        workingHours,
        socialMedia,
        removeLogo
      } = req.body;

      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      // Handle logo update
      if (removeLogo === 'true' && store.logo) {
        await imageHelpers.deleteImage(store.logo.publicId);
        store.logo = null;
      }

      if (req.file) {
        // Delete old logo if exists
        if (store.logo) {
          await imageHelpers.deleteImage(store.logo.publicId);
        }
        
        const uploadedImage = await imageHelpers.processSingleUpload(req.file);
        store.logo = {
          url: uploadedImage.url,
          publicId: uploadedImage.publicId
        };
      }

      // Update other fields
      if (name) store.name = name;
      if (description) store.description = description;
      if (category) store.category = category;
      if (workingHours) store.workingHours = workingHours;
      if (socialMedia) store.socialMedia = socialMedia;

      if (address || phone || email) {
        store.contactInfo = {
          ...store.contactInfo,
          ...(address && { address }),
          ...(phone && { phone }),
          ...(email && { email })
        };
      }

      store.updatedAt = new Date();
      await store.save();

      res.json({
        success: true,
        message: 'Store updated successfully',
        store
      });

    } catch (error) {
      console.error('Store update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update store',
        error: error.message
      });
    }
  },

  // Delete store
  deleteStore: async (req, res) => {
    try {
      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      // Check if store has active products
      const activeProducts = await Product.countDocuments({ 
        store: store._id, 
        isActive: true 
      });

      if (activeProducts > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete store with active products. Please deactivate all products first.'
        });
      }

      // Delete store logo
      if (store.logo) {
        await imageHelpers.deleteImage(store.logo.publicId);
      }

      await Store.findByIdAndDelete(store._id);

      res.json({
        success: true,
        message: 'Store deleted successfully'
      });

    } catch (error) {
      console.error('Store deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete store',
        error: error.message
      });
    }
  },

  // Add review to store
  addStoreReview: async (req, res) => {
    try {
      const { storeId } = req.params;
      const { rating, comment } = req.body;

      const store = await Store.findById(storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      // Check if user has already reviewed this store
      const existingReview = store.reviews.find(
        review => review.user.toString() === req.user.id
      );

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: 'You have already reviewed this store'
        });
      }

      // Add new review
      store.reviews.push({
        user: req.user.id,
        rating: parseInt(rating),
        comment,
        createdAt: new Date()
      });

      // Recalculate average rating
      const totalRating = store.reviews.reduce((sum, review) => sum + review.rating, 0);
      store.averageRating = totalRating / store.reviews.length;

      await store.save();

      // Populate the new review
      await store.populate({
        path: 'reviews.user',
        select: 'name avatar'
      });

      res.json({
        success: true,
        message: 'Review added successfully',
        review: store.reviews[store.reviews.length - 1],
        averageRating: store.averageRating
      });

    } catch (error) {
      console.error('Add review error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add review',
        error: error.message
      });
    }
  },

  // Get store categories
  getStoreCategories: async (req, res) => {
    try {
      const categories = await Store.distinct('category', { isActive: true });
      
      res.json({
        success: true,
        categories: categories.filter(cat => cat) // Remove null/empty categories
      });

    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  },

  // Toggle store status (active/inactive)
  toggleStoreStatus: async (req, res) => {
    try {
      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      store.isActive = !store.isActive;
      await store.save();

      res.json({
        success: true,
        message: `Store ${store.isActive ? 'activated' : 'deactivated'} successfully`,
        isActive: store.isActive
      });

    } catch (error) {
      console.error('Toggle store status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle store status',
        error: error.message
      });
    }
  },

  // Get stores near location (requires coordinates)
  getStoresNearby: async (req, res) => {
    try {
      const { latitude, longitude, radius = 10 } = req.query; // radius in km

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      // This would require adding geospatial indexing to your Store model
      // For now, we'll return all active stores
      const stores = await Store.find({ isActive: true })
        .populate('owner', 'name email')
        .limit(20)
        .select('-__v');

      res.json({
        success: true,
        stores,
        message: 'Geospatial search not implemented yet. Showing all active stores.'
      });

    } catch (error) {
      console.error('Get nearby stores error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch nearby stores',
        error: error.message
      });
    }
  },

  // Get store analytics (for store owners)
  getStoreAnalytics: async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query;
      
      const store = await Store.findOne({ owner: req.user.id });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const storeProductIds = await Product.find({ store: store._id }).distinct('_id');

      // Get analytics data
      const [
        totalProducts,
        totalOrders,
        totalRevenue,
        recentOrders,
        popularProducts
      ] = await Promise.all([
        Product.countDocuments({ store: store._id }),
        Order.countDocuments({
          'items.product': { $in: storeProductIds },
          createdAt: { $gte: startDate }
        }),
        Order.aggregate([
          {
            $match: {
              'items.product': { $in: storeProductIds },
              status: 'completed',
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ]),
        Order.find({
          'items.product': { $in: storeProductIds },
          createdAt: { $gte: startDate }
        })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(10),
        Product.find({ store: store._id })
          .sort({ sold: -1 })
          .limit(5)
          .select('name price images sold')
      ]);

      res.json({
        success: true,
        analytics: {
          timeframe,
          totalProducts,
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
          recentOrders,
          popularProducts,
          storeRating: store.averageRating || 0,
          totalReviews: store.reviews?.length || 0
        }
      });

    } catch (error) {
      console.error('Get store analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch store analytics',
        error: error.message
      });
    }
  }
};

module.exports = storeController;