import dotenv from "dotenv";
import express from "express";
import { bookRouter } from "./routes/bookRoutes.js";
import { seedRouter } from "./routes/seedRoutes.js";
import { userRouter } from "./routes/userRoutes.js";
import { connectDb } from "./utils/connectDb.js";

dotenv.config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDb();

app.use("/api/seed", seedRouter);
app.use("/api/auth", userRouter);
app.use("/api/books", bookRouter);

app.use((err, req, res, next) => {
  res.status(500).send({ message: err.message });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`serve at http://localhost:${port}`);
});
