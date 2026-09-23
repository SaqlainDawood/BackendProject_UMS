import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "../Models/StudentModel.js";
import connectDB from "../Config/ConnectDB.js";

dotenv.config();

async function migrate() {
  try {
    await connectDB();
    console.log("✅ DB connected");

    const result = await Student.updateMany(
      { isEmailVerified: { $exists: false } },
      { $set: { isEmailVerified: true } }
    );

    console.log(`✅ Migrated ${result.modifiedCount} students`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  }
}

migrate();