const express = require("express");

const app = express();

const cors = require("cors");

app.use(express.json());

app.use(cors());

const { connectDB } = require("../backend_practice/config/database");
const authRoutes = require("./routes/authRoutes");

connectDB();

app.get("/", (req, res) => {
  res.send("Hello World...");
});

//auth
app.use("/api/auth", authRoutes);

const port = 7777;

app.listen(port, () => {
  console.log("Server run on: " + port);
});
