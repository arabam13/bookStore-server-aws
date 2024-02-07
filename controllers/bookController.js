import asyncHandler from "express-async-handler";
import fs from "fs";
import BookModel from "../models/bookModel.js";

export const bookController = {
  createBook: asyncHandler(async (req, res) => {
    // console.log(req.file);
    // console.log(req.protocol);
    // console.log(req.auth);
    try {
      const userId = req.auth._id;
      const title = req.body.title;
      const author = req.body.author;
      const year = req.body.year;
      const genre = req.body.genre;
      const ratings = [];
      const averageRating = 0;
      // const host = req.get("host");
      // const imageUrl = `${req.protocol}://${host}/images/${req.file.filename}`;
      const imageUrl = `/images/${req.file.filename}`;

      const newBook = await BookModel.create({
        userId,
        title,
        author,
        year,
        genre,
        ratings,
        averageRating,
        imageUrl,
      });
      return res.status(201).json(newBook);
    } catch (err) {
      return res.status(500).json({ message: "Something went wrong" });
    }
  }),
  updateBook: asyncHandler(async (req, res) => {
    try {
      const existingBook = await BookModel.findById(req.params.id);
      if (req.file) {
        if (existingBook.imageUrl) {
          // console.log(existingBook.imageUrl);
          try {
            fs.unlinkSync(process.cwd() + existingBook.imageUrl);
            // console.log("deleted");
          } catch (err) {
            console.log(err);
          }
        }
        const imageUrl = `/images/${req.file.filename}`;
        existingBook.imageUrl = imageUrl;
      }
      if (req.body.title) {
        existingBook.title = req.body.title;
      }
      if (req.body.author) {
        existingBook.author = req.body.author;
      }
      if (req.body.year) {
        existingBook.year = req.body.year;
      }
      if (req.body.genre) {
        existingBook.genre = req.body.genre;
      }

      await existingBook.save();
      return res.status(200).json(existingBook);
      // return res.status(200).json({ message: "Book updated successfully" });
    } catch (err) {
      return res.status(500).json({ message: "Something went wrong" });
    }
  }),
  deleteBook: asyncHandler(async (req, res) => {
    try {
      const existingBook = await BookModel.findById(req.params.id);
      if (!existingBook) {
        return res.status(404).json({ message: "Book not found" });
      }
      if (existingBook.imageUrl) {
        // console.log(existingBook.imageUrl);
        try {
          fs.unlinkSync(process.cwd() + existingBook.imageUrl);
          // console.log("deleted");
        } catch (err) {
          console.log(err);
        }
      }

      await existingBook.deleteOne();
      res.send({ message: "Book Deleted" });
      // return res.status(200).json({ message: "Book updated successfully" });
    } catch (err) {
      return res.status(500).json({ message: "Something went wrong. " + err });
    }
  }),
  getAllBooks: asyncHandler(async (req, res) => {
    try {
      const books = await BookModel.find();
      return res.status(201).json(books);
    } catch (err) {
      return res.status(500).json({ message: "Something went wrong" });
    }
  }),
  getBook: asyncHandler(async (req, res) => {
    try {
      const book = await BookModel.findById(req.params.id);
      return res.status(201).json(book);
    } catch (err) {
      return res.status(500).json({ message: "Something went wrong" });
    }
  }),
};
