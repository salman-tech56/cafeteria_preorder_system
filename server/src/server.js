require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const User = require('./models/User');
const { seedAll } = require('./seed/seedData');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    const dbInfo = await connectDB();

    // Auto-seed if database is empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Startup] Empty database detected. Auto-seeding initial demo data...');
      await seedAll();
    } else {
      console.log(`[Startup] Database already initialized with ${userCount} users.`);
    }

    const server = app.listen(PORT, () => {
      console.log(`=========================================`);
      console.log(` ☕ CaféFlow PS62 Server running on port ${PORT}`);
      console.log(` 📦 Database mode: ${dbInfo.type}`);
      console.log(` 👥 Demo Staff:    staff@cafeflow.com / Staff@123`);
      console.log(` 👤 Demo Customer: customer@cafeflow.com / Customer@123`);
      console.log(` 🌐 Healthcheck:   http://localhost:${PORT}/api/health`);
      console.log(`=========================================`);
    });

    const shutdown = () => {
      console.log('Shutting down server gracefully...');
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
