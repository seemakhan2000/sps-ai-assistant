import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  try {
    await mongoose.connect(env.MONGO_URL, {
      serverSelectionTimeoutMS: 10000
    });

    console.log("SPS MongoDB connected successfully");

  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}