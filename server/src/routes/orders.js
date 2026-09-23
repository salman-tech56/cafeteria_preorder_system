const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect, requireRole } = require('../middleware/auth');

// Customer & authenticated routes
router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);

// Staff operational routes
router.get('/', protect, requireRole('staff'), getAllOrders);
router.patch('/:id/status', protect, requireRole('staff'), updateOrderStatus);

module.exports = router;
