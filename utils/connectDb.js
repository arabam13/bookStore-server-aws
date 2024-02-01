import mongoose from 'mongoose';

// console.log(process.env.NODE_ENV);
// console.log(process.env.MONGODB_URI_DEV);
export const connectDb = () =>
  mongoose
    .connect(
      process.env.NODE_ENV === 'dev'
        ? process.env.MONGODB_URI_DEV
        : process.env.MONGODB_URI_PROD
    )
    .then(() => {
      console.log('connected to db');
    })
    .catch((err) => {
      console.log(err.message);
      // mongoose.disconnect();
    });
