const express = require('express');
const {
  createPaymentOrder,
  verifyPayment,
  getTransactionHistory,
  processRefund,
  getPaymentMethods
} = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Payment routes
router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);
router.get('/methods', getPaymentMethods);
router.get('/transactions', getTransactionHistory);

// Seller/Admin routes
router.post('/refund', authorize('seller', 'admin'), processRefund);

module.exports = router;
