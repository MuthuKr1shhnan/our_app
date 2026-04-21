const validator = require("validator");
const jwt = require("jsonwebtoken");
const { User } = require("../models/User");

const validateSignUpData = async (req, res, next) => {
  try {
    const { firstName, lastName, age, email, address, password, phone } =
      req.body;

    if (!firstName || !lastName) {
      throw new Error("Name is not valid!");
    } else if (!validator.isEmail(email)) {
      throw new Error("Invalid Email!");
    } else if (!validator.isStrongPassword(password)) {
      throw new Error("Password is not Strong enough!");
    } else if (!validator.isMobilePhone(phone, "any")) {
      throw new Error("Phone number is not valid!");
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

const isAuthenticated = async (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Autherization error!",
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id } = decoded;

    const user = await User.findById({ _id: id });

    req.user = user;

    next();
  } catch (error) {
    console.error("Error in isAuthenticated middleware: ", error.message);
  }
};

module.exports = { validateSignUpData, isAuthenticated };
