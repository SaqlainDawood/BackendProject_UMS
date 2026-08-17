import mongoose from 'mongoose';

const ConnectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // allow longer time for server selection in slow networks
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      // other options are now defaults in newer mongoose versions
    });
    console.log(` MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(" MongoDB Connection Failed:", error?.message || error);
    console.error(error);
    // Do not exit immediately in development — keep process alive for debugging
    // but preserve previous behaviour for production by exiting when NODE_ENV=production
    if (process.env.NODE_ENV === 'production') process.exit(1);
    // Re-throw so callers can decide how to handle connection failures
    throw error;
  }
};

export default ConnectDB;