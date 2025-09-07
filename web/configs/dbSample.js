import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const connectDatabase = async () => {
  mongoose.Promise = global.Promise;
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(MONGODB_URI);
    console.log("Successfully connected to MongoDB");
    const isLog = true;
    if (isLog) {
      mongoose.set("debug", true);
    }
  } catch (error) {
    console.log(error);
  }
};

export default connectDatabase;
