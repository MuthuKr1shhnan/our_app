require("dotenv").config();

const mongoose = require("mongoose");
const { __esModule } = require("validator/lib/isAlpha");

const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, { dbName: "ourApp" });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB err", error.message);
    process.exit(1);
  }
};

module.exports = {
  connectDB,
};
