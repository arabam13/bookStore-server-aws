import express from "express";

import { userController } from "../controllers/userController.js";
// import { isAdmin, isAuth } from "../utils/functions.js";

export const userRouter = express.Router();

// userRouter.get('/users', isAuth, isAdmin, userController.getUsers);

userRouter.post("/signup", userController.signUp);
userRouter.post("/login", userController.login);
