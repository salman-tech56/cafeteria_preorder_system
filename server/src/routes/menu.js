const express = require('express');
const router = express.Router();
const {
  getMenuItems,
  getMenuItemById,
  getCategories,
  validateStock,
  createMenuItem,
  updateMenuItem,
  updateStock,
  deleteMenuItem,
} = require('../controllers/menuController');
const { protect, requireRole } = require('../middleware/auth');

// Public routes
router.get('/', getMenuItems);
router.get('/categories', getCategories);
router.post('/validate-stock', validateStock);
router.get('/:id', getMenuItemById);

// Staff-protected CRUD routes
router.post('/', protect, requireRole('staff'), createMenuItem);
router.put('/:id', protect, requireRole('staff'), updateMenuItem);
router.patch('/:id/stock', protect, requireRole('staff'), updateStock);
router.delete('/:id', protect, requireRole('staff'), deleteMenuItem);

module.exports = router;
