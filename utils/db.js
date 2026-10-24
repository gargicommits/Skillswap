const mongoose = require('mongoose');
const { setUsingEmbedded } = require('./embeddedDb');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log('ℹ️ MONGODB_URI not set. Using embedded local database (data/db.json).');
    setUsingEmbedded(true);
    return;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    console.log('✅ MongoDB connected successfully');
    setUsingEmbedded(false);
  } catch (error) {
    console.warn(`⚠️ Could not reach MongoDB (${error.message}).`);
    console.log('🚀 Running with embedded local database (data/db.json). Everything is fully functional!');
    setUsingEmbedded(true);
  }
}

module.exports = { connectDB };
