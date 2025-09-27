const express = require('express');
const {
  createBargain,
  getUserBargains,
  respondToBargain,
  getBargainById,
  getSellerBargains
} = require('../controllers/bargainController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBargain } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Buyer routes
router.post('/', validateBargain, createBargain);
router.get('/my', getUserBargains);

// Seller routes
router.get('/seller/bargains', authorize('seller'), getSellerBargains);
router.put('/:id', authorize('seller'), respondToBargain);

// Common routes
router.get('/:id', getBargainById);

module.exports = router;
