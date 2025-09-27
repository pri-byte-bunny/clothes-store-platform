const express = require('express');
const {
  createStore,
  getNearbyStores,
  getStoreById,
  updateStore,
  getMyStores,
  uploadStoreImages
} = require('../controllers/storeController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateStore } = require('../middleware/validation');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/nearby', getNearbyStores);
router.get('/:id', getStoreById);

// Protected routes
router.use(authenticate);

// Seller only routes
router.post('/', authorize('seller'), validateStore, createStore);
router.put('/:id', authorize('seller'), updateStore);
router.get('/my/stores', authorize('seller'), getMyStores);
router.post('/:id/images', authorize('seller'), upload.array('images', 5), uploadStoreImages);

module.exports = router;
