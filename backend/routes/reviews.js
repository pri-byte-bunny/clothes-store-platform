const express = require('express');
const {
  addReview,
  getReviews,
  updateReview,
  deleteReview,
  voteReview,
  addSellerResponse
} = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateReview } = require('../middleware/validation');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public routes
router.get('/:targetType/:targetId', getReviews);

// Protected routes
router.use(authenticate);

// User routes
router.post('/', upload.array('images', 5), validateReview, addReview);
router.put('/:id', updateReview);
router.delete('/:id', deleteReview);
router.post('/:id/vote', voteReview);

// Seller routes
router.post('/:id/response', authorize('seller'), addSellerResponse);

module.exports = router;
