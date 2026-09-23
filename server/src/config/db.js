const mongoose = require('mongoose');

let mongodInstance = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cafeflow';
  
  try {
    // Attempt connecting to provided MongoDB URI with 2.5s server selection timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[MongoDB] Connected to database at: ${uri}`);
    return { type: 'standalone', uri };
  } catch (err) {
    console.warn(`[MongoDB] Could not connect to local standalone MongoDB (${err.message}). Starting MongoMemoryServer fallback...`);
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
