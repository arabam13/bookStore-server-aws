import bcrypt from "bcryptjs";
import asyncHandler from "express-async-handler";
import UserModel from "../models/userModel.js";
import { generateToken } from "../utils/functions.js";

export const userController = {
  getUsers: asyncHandler(async (req, res) => {
    const users = await UserModel.find({});
    res.send({ users });
  }),

  signUp: asyncHandler(async (req, res) => {
    if (!req.body.email || !req.body.password) {
      return res
        .status(400)
        .send({ message: "Email and password are required" });
    }
    //check if user already exists
    const user = await UserModel.findOne({ email: req.body.email });
    if (user) {
      return res.status(400).send({ message: "User already exists" });
    }

    const newUser = await UserModel.create({
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password),
    });
    res.send({
      _id: newUser._id,
      email: newUser.email,
      token: "Bearer " + generateToken(newUser),
    });
  }),

  login: asyncHandler(async (req, res) => {
    if (!req.body.email || !req.body.password) {
      return res
        .status(400)
        .send({ message: "Email and password are required" });
    }
    const user = await UserModel.findOne({ email: req.body.email });
    if (user) {
      if (bcrypt.compare(req.body.password, user.password)) {
        return res.send({
          _id: user._id,
          // email: user.email,
          token: "Bearer " + generateToken(user),
        });
      }
    }
    return res.status(401).send({ message: "Invalid email or password" });
  }),
};
