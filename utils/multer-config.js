import multer from "multer";

const MIME_TYPE = {
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./images");
  },
  filename: (req, file, callback) => {
    // console.log({ file });
    // console.log("fileOriginalName: " + file.originalname);
    const filename = file.originalname.split(" ").join("_");
    const filenameArray = filename.split(".");
    filenameArray.pop();
    const filenameWithoutExtention = filenameArray.join(".");
    const extension = MIME_TYPE[file.mimetype];
    callback(null, filenameWithoutExtention + Date.now() + "." + extension);
  },
});

export const multerMiddleware = multer({ storage }).single("image");
