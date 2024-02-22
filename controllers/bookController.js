import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import dotenv from "dotenv";
import asyncHandler from "express-async-handler";
import sharp from "sharp";
import BookModel from "../models/bookModel.js";

dotenv.config();

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
// console.log({ region, bucketName, accessKeyId, secretAccessKey });

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});
// console.log({ s3Client });
const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

const sendImageToAWSAndGetImageUrl = async (req) => {
  // console.log(req.file);
  const fileBuffer = await sharp(req.file.buffer)
    .resize({ height: 391, width: 456, fit: "contain" })
    .toBuffer();

  // Configure the upload details to send to S3
  const fileName = generateFileName();
  const uploadParams = {
    Bucket: bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: req.file.mimetype,
  };

  // Send the upload to S3
  await s3Client.send(new PutObjectCommand(uploadParams));
  //generate URL for post created
  const imageUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: fileName,
    })
    // { expiresIn: 60 } // 60 seconds
  );
  return imageUrl;
};

const deleteImageFromAws = async (existingBook) => {
  console.log({ bucketName });
  console.log("existingBook.imageUrl2: ", existingBook.imageUrl);
  // console.log({ s3Client });

  const deleteParams = {
    Bucket: bucketName,
    Key: existingBook.imageUrl,
  };

  const data = await s3Client.send(new DeleteObjectCommand(deleteParams));
  console.log({ data });
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
        // deleteImageIfError(req);
        return res.status(400).json({ message: "Title is required" });
      }
      const existingTitle = await BookModel.find({ title: title });
      if (existingTitle && existingTitle.length > 0) {
        // deleteImageIfError(req);
        return res.status(400).json({ message: "Title already exists" });
      }
      const author = book.author;
      if (!author) {
        // deleteImageIfError(req.file);
        return res.status(400).json({ message: "Author is required" });
      }
      const year = book.year;
      if (!year) {
        // deleteImageIfError(req);
        return res.status(400).json({ message: "Year is required" });
      }
      const genre = book.genre;
      if (!genre) {
        // deleteImageIfError(req);
        return res.status(400).json({ message: "Genre is required" });
      }

      const imageUrl = await sendImageToAWSAndGetImageUrl(req);

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
      // console.log(err);
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
      //if new file is uploaded
      if (req.file) {
        if (existingBook.imageUrl) {
          try {
            deleteImageFromAws(existingBook);
            existingBook.imageUrl = sendImageToAWSAndGetImageUrl(req);
            const bookToUpdateWithJoinedFile = JSON.parse(req.body.book);
            existingBook.title = bookToUpdateWithJoinedFile.title;
            existingBook.author = bookToUpdateWithJoinedFile.author;
            existingBook.year = bookToUpdateWithJoinedFile.year;
            existingBook.genre = bookToUpdateWithJoinedFile.genre;
            await existingBook.save();
            return res
              .status(200)
              .json({ message: "Book updated successfully" });
          } catch (err) {
            console.log(err);
          }
        }
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
        // console.log("existingBook.imageUrl1: ", existingBook.imageUrl);
        try {
          // deleteImageFromAws(existingBook);
          console.log({ bucketName });
          console.log("existingBook.imageUrl2: ", existingBook.imageUrl);
          // console.log({ s3Client });

          const deleteParams = {
            Bucket: bucketName,
            Key: existingBook.imageUrl,
          };

          const data = await s3Client.send(
            new DeleteObjectCommand(deleteParams)
          );
          console.log({ data });
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
