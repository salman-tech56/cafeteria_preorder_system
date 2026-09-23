const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cafeflow';
  const isAtlas = uri.startsWith('mongodb+srv://');
  const isProduction = process.env.NODE_ENV === 'production';
  const timeoutMs = isProduction || isAtlas ? 10000 : 2500;

  try {
    // Attempt connecting to provided MongoDB URI (Atlas or local standalone)
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: timeoutMs,
    });
    // Mask password in logs to prevent secret leakage
    const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.log(`[MongoDB] Connected to database: ${maskedUri}`);
    return { type: isAtlas ? 'atlas' : 'standalone', uri };
  } catch (err) {
    if (isAtlas || isProduction) {
      console.error(
        `[MongoDB Atlas Error] Failed to connect to database (${err.message}). ` +
          `Verify MONGODB_URI in Render environment and ensure MongoDB Atlas Network Access allows 0.0.0.0/0.`
      );
      throw err;
    }

    console.warn(
      `[MongoDB] Could not connect to local standalone MongoDB (${err.message}). Starting MongoMemoryServer development fallback...`
    );
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const memoryUri = mongodInstance.getUri();
      await mongoose.connect(memoryUri);
      console.log(`[MongoDB] Connected to MongoMemoryServer (in-memory) at: ${memoryUri}`);
      return { type: 'memory', uri: memoryUri };
    } catch (memErr) {
      console.error(`[MongoDB] Failed to start MongoMemoryServer:`, memErr);
      throw memErr;
    }
  }
};

const closeDB = async () => {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
};

module.exports = { connectDB, closeDB };
