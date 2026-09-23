const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const { protect, requireRole } = require('../middleware/auth');

// Protected staff route for analytics
router.get('/', protect, requireRole('staff'), getAnalytics);

module.exports = router;
