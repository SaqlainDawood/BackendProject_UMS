import mongoose from 'mongoose';

let cached = global._mongooseConn;
if (!cached) cached = global._mongooseConn = { conn: null, promise: null };

const ConnectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        bufferCommands: true,
      })
      .then((mongooseInstance) => {
        console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
        return mongooseInstance;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null; // agli request pe retry ho sake
    console.error("MongoDB Connection Failed:", error?.message || error);
    throw error;
  }

  return cached.conn;
};

export default ConnectDB;