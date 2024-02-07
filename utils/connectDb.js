import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

// console.log(process.env.MONGODB_URI_DEVELOPMENT);
// console.log(process.env.MONGODB_URI_PROD);
// console.log(process.env.NODE_ENV);
export const connectDb = () =>
  mongoose
    .connect(
      process.env.NODE_ENV === "development"
        ? process.env.MONGODB_URI_DEVELOPMENT
        : process.env.MONGODB_URI_PROD
    )
    .then(() => {
      console.log("connected to db");
    })
    .catch((err) => {
      console.log(err.message);
      // mongoose.disconnect();
    });
