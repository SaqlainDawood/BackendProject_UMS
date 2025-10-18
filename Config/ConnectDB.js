import mongoose from 'mongoose'

const ConnectDB = async()=>{
        try {
            await mongoose.connect(process.env.MONGODB_URI)
            console.log("Mongo_DB connected Successfully");
        } catch (error) {
            console.log(`MongoDB Connection Failed` , error);
        }
}
export default ConnectDB;