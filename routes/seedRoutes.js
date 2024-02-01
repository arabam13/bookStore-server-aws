import express from 'express';
import { seedController } from '../controllers/seedController.js';
// import { isAdmin, isAuth } from '../utils/functions.js';

export const seedRouter = express.Router();

// seedRouter.get('/', isAuth, isAdmin, seedController.generateUsers);
seedRouter.get('/', seedController.generateUsers);
export default seedRouter;
