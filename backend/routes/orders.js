const express = require('express');
const {
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getSellerOrders
} = require('../controllers/orderController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Buyer routes
router.post('/', validateOrder, createOrder);
router.get('/my', getUserOrders);
router.put('/:id/cancel', cancelOrder);

// Seller routes
router.get('/seller/orders', authorize('seller'), getSellerOrders);
router.put('/:id/status', authorize('seller'), updateOrderStatus);

// Common routes
router.get('/:id', getOrderById);

module.exports = router;
