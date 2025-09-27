const express = require('express');
const {
  addProduct,
  getProductsByStore,
  getProductById,
  updateProduct,
  deleteProduct,
  searchProducts,
  uploadProductImages,
  getMyProducts,
  getFeaturedProducts
} = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateProduct } = require('../middleware/validation');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/search', searchProducts);
router.get('/featured', getFeaturedProducts);
router.get('/store/:storeId', getProductsByStore);
router.get('/:id', getProductById);

// Protected routes
router.use(authenticate);

// Seller only routes
router.post('/', authorize('seller'), validateProduct, addProduct);
router.put('/:id', authorize('seller'), updateProduct);
router.delete('/:id', authorize('seller'), deleteProduct);
router.get('/my/products', authorize('seller'), getMyProducts);
router.post('/:id/images', authorize('seller'), upload.array('images', 10), uploadProductImages);

module.exports = router;
