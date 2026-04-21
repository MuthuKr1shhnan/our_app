const express = require("express");

const app = express();

const cors = require("cors");

const cookieParser = require("cookie-parser");

const { connectDB } = require("../backend_practice/config/database");

const authRoutes = require("./routes/authRoutes");

const { isAuthenticated } = require("./middlewares/authMiddleware");

const userRoutes  = require("./routes/userRoutes");

app.use(cookieParser());

app.use(express.json());

app.use(cors());


app.get("/", (req, res) => {
  res.send("Hello World...");
});

//auth
app.use("/api/auth", authRoutes);

//profile
app.use("/api/user", isAuthenticated, userRoutes);

connectDB()
  .then(() => console.log("DB Connected successfully!"))
  .catch((err) => {
    console.err(err.message);
  });

const port = 7777;

app.listen(port, () => {
  console.log("Server run on: " + port);
});
