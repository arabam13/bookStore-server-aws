import express from "express";
import { bookController } from "../controllers/bookController.js";
import { isAuth } from "../utils/functions.js";
import { multerMiddleware } from "../utils/multer-config.js";

export const bookRouter = express.Router();

bookRouter.get("/", bookController.getAllBooks);
bookRouter.get("/:id", bookController.getBook);
bookRouter.post("/", isAuth, multerMiddleware, bookController.createBook);
bookRouter.put("/:id", isAuth, multerMiddleware, bookController.updateBook);
bookRouter.delete("/:id", isAuth, bookController.deleteBook);
