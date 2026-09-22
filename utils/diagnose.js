// utils/diagnose.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../Config/ConnectDB.js";

dotenv.config();

async function diagnose() {
  try {
    await connectDB();
    console.log("✅ DB connected for diagnosis...\n");

    // 1. Currently connected database name
    const currentDB = mongoose.connection.db.databaseName;
    console.log(`📌 Currently connected DB: "${currentDB}"`);
    console.log(`📌 Host: ${mongoose.connection.host}\n`);

    // 2. List all collections in current DB
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    console.log(`📋 Collections in "${currentDB}":`);
    for (const c of collections) {
      const count = await mongoose.connection.db
        .collection(c.name)
        .countDocuments();
      console.log(`   - ${c.name} (${count} documents)`);
    }
    console.log("");

    // 3. List ALL databases on the cluster (admin only)
    try {
      const admin = mongoose.connection.db.admin();
      const dbs = await admin.listDatabases();
      console.log("🗄️  All databases on cluster:");
      for (const db of dbs.databases) {
        console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024).toFixed(1)} KB)`);
      }
    } catch (e) {
      console.log("⚠️  Could not list databases (permission issue):", e.message);
    }

    console.log("\n🎉 Diagnosis complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

diagnose();