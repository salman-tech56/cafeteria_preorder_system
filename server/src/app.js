const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const slotRoutes = require('./routes/slots');
const orderRoutes = require('./routes/orders');
const analyticsRoutes = require('./routes/analytics');

const app = express();

// Dynamic CORS configuration supporting Vercel deployments & localhost
const rawClientUrl = process.env.CLIENT_URL || '';
const configuredOrigins = rawClientUrl
  ? rawClientUrl.split(',').map((u) => u.trim().replace(/\/+$/, ''))
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, Render healthchecks)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');

    // Allow if matching configured list, vercel preview domain, or local dev
    if (
      configuredOrigins.includes('*') ||
      configuredOrigins.length === 0 ||
      configuredOrigins.includes(normalizedOrigin) ||
      normalizedOrigin.endsWith('.vercel.app') ||
      normalizedOrigin.startsWith('http://localhost') ||
      normalizedOrigin.startsWith('http://127.0.0.1')
    ) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root fallback
app.get('/', (req, res) => {
  res.json({
    message: 'CaféFlow PS62 Backend API is running.',
    tagline: 'Your Food. Your Time. Your Way.',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      menu: '/api/menu',
      slots: '/api/slots',
      orders: '/api/orders',
      analytics: '/api/analytics',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error('[Error Handler]', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
});

module.exports = app;
