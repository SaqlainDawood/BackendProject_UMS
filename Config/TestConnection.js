import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

console.log("Testing connection to:", process.env.MONGODB_URI?.replace(/:[^:@]+@/, ":****@"));

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000, // 8 second mein fail ho jaye, hang na ho
    });
    console.log("✅ SUCCESS — MongoDB Connected:", mongoose.connection.host);
  } catch (err) {
    console.log("❌ FAILED — Reason:");
    console.log(err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

testConnection();