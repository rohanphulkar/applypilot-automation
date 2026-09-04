import { config } from "dotenv";
import mongoose from "mongoose";
config();

export async function connectDB() {
  try {
    const con = await mongoose.connect(process.env.MONGO_URI);
    console.log("Db Connected: ", con.connection.host);
  } catch (error) {
    console.log(error);
  }
}
