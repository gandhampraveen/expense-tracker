const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      console.log(`Connecting to MongoDB using MONGODB_URI...`);
      await mongoose.connect(uri);
      console.log('MongoDB Connected successfully.');
      return;
    } catch (err) {
      console.error('Failed to connect to process.env.MONGODB_URI:', err.message);
    }
  }

  // If no MONGODB_URI or URI connection failed, attempt local connection
  const defaultLocalUri = 'mongodb://127.0.0.1:27017/expense_tracker';
  try {
    console.log(`Attempting local MongoDB connection at ${defaultLocalUri}...`);
    await mongoose.connect(defaultLocalUri, {
      serverSelectionTimeoutMS: 2500
    });
    console.log('MongoDB Connected successfully to local database server.');
    return;
  } catch (err) {
    console.warn('Local MongoDB server not reachable on port 27017.');
  }

  // Attempt in-memory MongoDB Server (useful for local dev/testing without a local MongoDB service)
  console.log('Starting in-memory MongoDB Server (mongodb-memory-server)...');
  try {
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log(`Connected to In-Memory MongoDB at ${mongoUri}`);
  } catch (memErr) {
    console.warn('⚠️ In-Memory MongoDB could not start:', memErr.message);
    console.warn('💡 Tip for Render/Railway: Add MONGODB_URI environment variable in your dashboard to connect to MongoDB Atlas.');
  }
};

module.exports = connectDB;
