const express = require('express');
const {
  createTicket,
  getUserTickets,
  getTicketById,
  addTicketResponse,
  closeTicket,
  getAllTickets,
  assignTicket,
  updateTicketStatus
} = require('../controllers/supportController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateTicket } = require('../middleware/validation');
const { upload } = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// User routes
router.post('/', upload.array('attachments', 3), validateTicket, createTicket);
router.get('/my', getUserTickets);
router.post('/:id/response', upload.array('attachments', 3), addTicketResponse);
router.put('/:id/close', closeTicket);

// Admin routes (if needed)
router.get('/admin/all', authorize('admin'), getAllTickets);
router.put('/admin/:id/assign', authorize('admin'), assignTicket);
router.put('/admin/:id/status', authorize('admin'), updateTicketStatus);

// Common routes
router.get('/:id', getTicketById);

module.exports = router;
