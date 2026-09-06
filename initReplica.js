import mongoose from "mongoose";

const run = async () => {
  try {
    const conn = await mongoose.createConnection("mongodb://localhost:27017/admin").asPromise();
    const result = await conn.db.admin().command({ replSetInitiate: {} });
    console.log("Replica set initiated:", result);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit(0);
  }
};

run();