import asyncHandler from 'express-async-handler';
import UserModel from '../models/userModel.js';
import { data } from '../utils/data.js';

export const seedController = {
  generateUsers: asyncHandler(async (req, res) => {
    await UserModel.deleteMany({});
    const createdUsers = await UserModel.insertMany(data.users);
    res.send({ createdUsers });
  }),
};
