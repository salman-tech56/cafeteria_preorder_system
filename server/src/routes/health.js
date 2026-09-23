const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

router.get('/', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await query('SELECT 1');
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'error: ' + e.message;
  }

  res.status(200).json({
    status: 'ok',
    service: 'CaféFlow PS62 API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: 'MySQL',
    dbStatus,
  });
});

module.exports = router;
