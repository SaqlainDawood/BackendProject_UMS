import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function checkIndexes() {
  await mongoose.connect(process.env.MONGODB_URI);
  const indexes = await mongoose.connection.db.collection("batches").indexes();
  console.log("Current indexes on 'batches' collection:");
  console.log(JSON.stringify(indexes, null, 2));
  await mongoose.disconnect();
}

checkIndexes();