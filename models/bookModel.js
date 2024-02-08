import mongoose from "mongoose";

// userId : String - identifiant MongoDB unique de l'utilisateur qui a créé le livre
// title : String - titre du livre
// author : String - auteur du livre
// imageUrl : String - illustration/couverture du livre
// year: Number - année de publication du livre
// genre: String - genre du livre
// ratings : [
//   {
//   userId : String - identifiant MongoDB unique de l'utilisateur qui a noté le livre
//   grade : Number - note donnée à un livre
//   }
// ] - notes données à un livre
// averageRating : Number - note moyenne du livre

const ratingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    grade: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

const bookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, unique: true },
    author: { type: String, required: true },
    imageUrl: { type: String, required: true },
    year: { type: Number, required: true },
    genre: { type: String, required: true },
    ratings: [ratingSchema],
    averageRating: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

const BookModel = mongoose.model("Book", bookSchema);
export default BookModel;
