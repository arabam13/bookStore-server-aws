import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import crypto from "crypto";
import dotenv from "dotenv";
import asyncHandler from "express-async-handler";
import sharp from "sharp";
import BookModel from "../models/bookModel.js";

dotenv.config();

const bucketName = process.env.AWS_BUCKET_NAMEE;
const region = process.env.AWS_BUCKET_REGIONN;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const cloudfront = new CloudFrontClient({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

const sendImageToAWSAndGetImageUrl = async (req) => {
  // Resize the image
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

  //set the url from cloudfront to expire in 1 minute
  const imageUrl = `https://d9xqu7rtjlo4f.cloudfront.net/${fileName}`;
  const signedUrl = getSignedUrl({
    keyPairId: process.env.CLOUDFRONT_KEYPAIR_ID,
    privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
    url: imageUrl,
    dateLessThan: new Date(Date.now() + 1000 * 60),
  });
  return signedUrl;
};

const deleteImageFromAws = async (existingBook) => {
  const imageName = existingBook.imageUrl.split("?")[0].split("/")[3];
  const deleteParams = {
    Bucket: bucketName,
    Key: imageName,
  };
  //delete the image from s3
  await s3Client.send(new DeleteObjectCommand(deleteParams));
  //invalidate the cloudfront cache
  const cfCommand = new CreateInvalidationCommand({
    DistributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: imageName,
      Paths: {
        Quantity: 1,
        Items: ["/" + imageName],
      },
    },
  });
  await cloudfront.send(cfCommand);
};

export const bookController = {
  bestRatingBooks: asyncHandler(async (req, res) => {
    try {
      const bestRatingBooks = await BookModel.find()
        .sort({ averageRating: -1 })
        .limit(3);
      for (let book of bestRatingBooks) {
        //set the url from cloudfront to expire in 1 minute
        book.imageUrl = getSignedUrl({
          keyPairId: process.env.CLOUDFRONT_KEYPAIR_ID,
          privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
          url: book.imageUrl.split("?")[0],
          dateLessThan: new Date(Date.now() + 1000 * 60),
        });
      }
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
        return res.status(400).json({ message: "Title already exists" });
      }
      const author = book.author;
      if (!author) {
        return res.status(400).json({ message: "Author is required" });
      }
      const year = book.year;
      if (!year) {
        return res.status(400).json({ message: "Year is required" });
      }
      const genre = book.genre;
      if (!genre) {
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
      console.log(err);
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
        // deleteImageIfError(req.file);
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
        try {
          deleteImageFromAws(existingBook);
        } catch (err) {
          console.log(err);
          return res
            .status(500)
            .json({ message: "Error deleting image from AWS" });
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
      for (let book of books) {
        //set the url from cloudfront to expire in 1 minute
        book.imageUrl = getSignedUrl({
          keyPairId: process.env.CLOUDFRONT_KEYPAIR_ID,
          privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
          url: book.imageUrl.split("?")[0],
          dateLessThan: new Date(Date.now() + 1000 * 60),
        });
      }
      return res.status(200).json(books);
    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }),
  getBook: asyncHandler(async (req, res) => {
    try {
      const existingBook = await BookModel.findById(req.params.id);
      if (!existingBook) {
        return res.status(404).json({ message: "Book not found" });
      }
      //set the url from cloudfront to expire in 1 minute
      existingBook.imageUrl = getSignedUrl({
        keyPairId: process.env.CLOUDFRONT_KEYPAIR_ID,
        privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
        url: existingBook.imageUrl.split("?")[0],
        dateLessThan: new Date(Date.now() + 1000 * 60),
      });
      return res.status(200).json(existingBook);
    } catch (err) {
      return res.status(500).json({ message: "Something went wrong" });
    }
  }),
};
