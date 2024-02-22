import asyncHandler from "express-async-handler";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import BookModel from "../models/bookModel.js";

const deleteImageIfError = (req) => {
  if (req.file) {
    fs.unlinkSync(path.join(process.cwd(), req.file.path));
  }
};
export const bookController = {
  bestRatingBooks: asyncHandler(async (req, res) => {
    try {
      const bestRatingBooks = await BookModel.find()
        .sort({ averageRating: -1 })
        .limit(3);
      return res.status(200).json(bestRatingBooks);
    } catch (err) {
      return res.status(500).json({ message: "Something went wrong" });
    }
  }),
  ratingBook: asyncHandler(async (req, res) => {
    try {
      const existingBook = await BookModel.findById(req.params.id);
      if (!existingBook) {
        return res.status(404).json({ message: "Book not found" });
      }
      const userId = req.auth._id;
      const rating = +req.body.rating;
      if (rating < 0 || rating > 5) {
        return res
          .status(400)
          .json({ message: "rating must be between 0 and 5" });
      }
      const existingUserRating = existingBook.ratings.find(
        (rating) => rating.userId.toString() === userId.toString()
      );
      if (existingUserRating) {
        return res
          .status(200)
          .json({ message: "rating already existing for this userId" });
      } else {
        existingBook.ratings.push({ userId, grade: rating });
      }

      //update average rating
      const sumOfRatings = existingBook.ratings.reduce((acc, rating) => {
        return acc + rating.grade;
      }, 0);

      existingBook.averageRating = sumOfRatings / existingBook.ratings.length;
      await existingBook.save();

      return res.status(200).json(existingBook);
    } catch (err) {
      return res.status(500).json({ message: "Something went wrong" });
    }
  }),
  createBook: asyncHandler(async (req, res) => {
    try {
      const userId = req.auth._id;
      const book = JSON.parse(req.body.book);
      const title = book.title;
      if (!title) {
        deleteImageIfError(req);
        return res.status(400).json({ message: "Title is required" });
      }
      const existingTitle = await BookModel.find({ title: title });
      if (existingTitle && existingTitle.length > 0) {
        deleteImageIfError(req);
        return res.status(400).json({ message: "Title already exists" });
      }
      const author = book.author;
      if (!author) {
        deleteImageIfError(req.file);
        return res.status(400).json({ message: "Author is required" });
      }
      const year = book.year;
      if (!year) {
        deleteImageIfError(req);
        return res.status(400).json({ message: "Year is required" });
      }
      const genre = book.genre;
      if (!genre) {
        deleteImageIfError(req);
        return res.status(400).json({ message: "Genre is required" });
      }
      try {
        //resize image
        await sharp(path.join(process.cwd(), req.file.path))
          .resize({
            width: 391,
            height: 456,
          })
          .toFile(
            path.join(process.cwd(), "images", "resized_" + req.file.filename)
          );
        //delete original image
        fs.unlinkSync(path.join(process.cwd(), req.file.path));
      } catch (error) {
        console.log(`An error occurred during processing: ${error}`);
      }
      const imageUrl = `${req.protocol}://${req.get("host")}/${path.join(
        "images",
        "resized_" + req.file.filename
      )}`;
      await BookModel.create({
        userId,
        title,
        author,
        year,
        genre,
        imageUrl,
        ratings: [],
        averageRating: 0,
      });
      return res.status(201).json({ message: "Book created successefully" });
    } catch (err) {
      return res.status(500).json({ message: "Something went wrong" });
    }
  }),
  updateBook: asyncHandler(async (req, res) => {
    try {
      const existingBook = await BookModel.findById(req.params.id);
      if (!existingBook) {
        return res.status(404).json({ message: "Book not found" });
      }
      if (existingBook.userId.toString() !== req.auth._id.toString()) {
        deleteImageIfError(req.file);
        return res
          .status(403)
          .json({ message: "You are not authorized to update" });
      }
      if (req.file) {
        if (existingBook.imageUrl) {
          try {
            fs.unlinkSync(
              path.join(
                process.cwd(),
                existingBook.imageUrl.split("/").slice(-2).join("/")
              )
            );
            // console.log("deleted");
          } catch (err) {
            console.log(err);
          }
        }
        try {
          //resize image
          await sharp(path.join(process.cwd(), req.file.path))
            .resize({
              width: 391,
              height: 456,
            })
            .toFile(
              path.join(process.cwd(), "images", "resized_" + req.file.filename)
            );
          //delete original image
          fs.unlinkSync(path.join(process.cwd(), req.file.path));
        } catch (error) {
          console.log(`An error occurred during processing: ${error}`);
        }
        const imageUrl = `${req.protocol}://${req.get("host")}/${path.join(
          "images",
          "resized_" + req.file.filename
        )}`;
        existingBook.imageUrl = imageUrl;
        const bookToUpdateWithJoinedFile = JSON.parse(req.body.book);
        existingBook.title = bookToUpdateWithJoinedFile.title;
        existingBook.author = bookToUpdateWithJoinedFile.author;
        existingBook.year = bookToUpdateWithJoinedFile.year;
        existingBook.genre = bookToUpdateWithJoinedFile.genre;
        await existingBook.save();
        return res.status(200).json({ message: "Book updated successfully" });
      }
      existingBook.title = req.body.title;
      existingBook.author = req.body.author;
      existingBook.year = req.body.year;
      existingBook.genre = req.body.genre;
      await existingBook.save();
      return res.status(200).json({ message: "Book updated successfully" });
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
      if (existingBook.userId.toString() !== req.auth._id.toString()) {
        return res
          .status(403)
          .json({ message: "You are not authorized to delete" });
      }
      if (existingBook.imageUrl) {
        try {
          fs.unlinkSync(
            path.join(
              process.cwd(),
              existingBook.imageUrl.split("/").slice(-2).join("/")
            )
          );
          // console.log("deleted");
        } catch (err) {
          console.log(err);
        }
      }

      await existingBook.deleteOne();
      res.send({ message: "Book Deleted" });
    } catch (err) {
      return res.status(500).json({ message: "Something went wrong. " + err });
    }
  }),
  getAllBooks: asyncHandler(async (req, res) => {
    try {
      const books = await BookModel.find();
      return res.status(200).json(books);
    } catch (err) {
      return res.status(500).json({ message: "Something went wrong" });
    }
  }),
  getBook: asyncHandler(async (req, res) => {
    try {
      const existingBook = await BookModel.findById(req.params.id);
      if (!existingBook) {
        return res.status(404).json({ message: "Book not found" });
      }
      return res.status(200).json(existingBook);
    } catch (err) {
      return res.status(500).json({ message: "Something went wrong" });
    }
  }),
};
