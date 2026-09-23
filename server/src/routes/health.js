const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

router.get('/', (req, res) => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    status: 'ok',
    service: 'CaféFlow PS62 API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    dbStatus: states[state] || 'unknown',
  });
});

module.exports = router;
