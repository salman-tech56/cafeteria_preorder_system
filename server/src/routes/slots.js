const express = require('express');
const router = express.Router();
const {
  getPickupSlots,
  createPickupSlot,
  updatePickupSlot,
  deletePickupSlot,
} = require('../controllers/slotController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', getPickupSlots);
router.post('/', protect, requireRole('staff'), createPickupSlot);
router.put('/:id', protect, requireRole('staff'), updatePickupSlot);
router.delete('/:id', protect, requireRole('staff'), deletePickupSlot);

module.exports = router;
