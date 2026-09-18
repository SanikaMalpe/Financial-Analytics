import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Transaction from './models/Transaction';
import User from './models/User';

const rawData = require('../transactions.json');

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('✅ Connected to MongoDB');

    await Transaction.deleteMany({});
    await User.deleteMany({});
    console.log('🧹 Cleared existing data');

    // FIX: Pass plain text password. The User model pre-save hook will hash it automatically!
    await User.create({
      name: 'Test Analyst',
      email: 'test@loopr.ai',
      password: 'password123', 
    });
    console.log('👤 Created default user: test@loopr.ai / password123');

    // Clean the JSON data (remove trailing spaces from keys if any exist)
    const cleanedData = rawData.map((item: any) => {
      const cleaned: any = {};
      for (const key in item) {
        cleaned[key.trim()] = item[key];
      }
      return cleaned;
    });

    await Transaction.insertMany(cleanedData);
    console.log(`📊 Successfully seeded ${cleanedData.length} transactions`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();