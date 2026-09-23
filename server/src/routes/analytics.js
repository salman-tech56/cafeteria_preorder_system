const express = require('express');
const router = express.Router();
const {
  getAnalytics,
  getTodayAnalytics,
  getWeeklyAnalytics,
} = require('../controllers/analyticsController');
const { protect, requireRole } = require('../middleware/auth');

// Protected staff routes for analytics
router.get('/', protect, requireRole('staff'), getAnalytics);
router.get('/today', protect, requireRole('staff'), getTodayAnalytics);
router.get('/weekly', protect, requireRole('staff'), getWeeklyAnalytics);

module.exports = router;
