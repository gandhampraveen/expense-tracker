const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense_tracker';
  
  try {
    // Set short timeout for local connection attempt so we can fall back quickly if offline
    console.log(`Connecting to MongoDB at ${uri}...`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500
    });
    console.log('MongoDB Connected successfully to local database server.');
  } catch (err) {
    console.warn('Local MongoDB server not reachable:', err.message);
    console.log('Starting in-memory MongoDB Server (mongodb-memory-server)...');
    try {
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log(`Connected to In-Memory MongoDB at ${mongoUri}`);
    } catch (memErr) {
      console.error('Failed to start in-memory MongoDB:', memErr.message);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
