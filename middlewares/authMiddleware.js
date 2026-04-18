const validator = require("validator");

const validateSignUpData = async (req, res, next) => {
  try {
    const { firstName, lastName, age, email, address, password } = req.body;

    if (!firstName || !lastName) {
      throw new Error("Name is not valid!");
    } else if (!validator.isEmail(email)) {
      throw new Error("Invalid Email!");
    } else if (!validator.isStrongPassword(password)) {
      throw new Error("Password is not Strong enough!");
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = { validateSignUpData };
