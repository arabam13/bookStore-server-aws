import multer from "multer";

// const MIME_TYPE = {
//   "image/jpg": "jpg",
//   "image/jpeg": "jpg",
//   "image/png": "png",
//   "image/webp": "webp",
// };

// const storage = multer.diskStorage({
//   destination: function (req, file, callback) {
//     const isValid = MIME_TYPE[file.mimetype];
//     if (!isValid) {
//       const error = new Error("Invalid mime type");
//       return callback(error, "./images");
//     }

//     callback(null, "./images");
//   },
//   filename: (req, file, callback) => {
//     const filename = file.originalname.split(" ").join("_");
//     const filenameArray = filename.split(".");
//     filenameArray.pop();
//     const filenameWithoutExtention = filenameArray.join(".");
//     const extension = MIME_TYPE[file.mimetype];
//     callback(null, filenameWithoutExtention + uuid() + "." + extension);
//   },
// });
// export const multerMiddleware = multer({ storage }).single("image");

const storage = multer.memoryStorage();
export const multerMiddleware = multer({ storage }).single("image");
