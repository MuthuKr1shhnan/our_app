const mongoose = require("mongoose");

const validator = require("validator");

const { Schema } = mongoose;

const userSchema = new Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
  },

  age: {
    type: Number,
    min: 18,
    max: 50,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: "Please enter a valid email address",
    },
  },

  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: function (v) {
        // You can specify locale, e.g. 'en-IN' for India, 'en-US' for US
        return validator.isMobilePhone(v, "any");
      },
      message: (props) => `${props.value} is not a valid phone number!`,
    },
  },

  address: {
    type: String,
  },

  password: {
    type: String,
    required: true,
    minlength: [8, "Password must be at least 8 characters"],
    validate: {
      validator: function (v) {
        // validator doesn’t have a built‑in “strong password” check,
        // but it does have isStrongPassword:
        return validator.isStrongPassword(v, {
          minLength: 8,
          minLowercase: 1,
          minUppercase: 1,
          minNumbers: 1,
          minSymbols: 1,
        });
      },
      message:
        "Password must include uppercase, lowercase, number, and special character",
    },
  },
});

const User = mongoose.model("User", userSchema);

module.exports = {
  User,
};
