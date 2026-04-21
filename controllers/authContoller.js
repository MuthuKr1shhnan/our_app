const { User } = require("../models/User");

const bcrypt = require("bcrypt");

const signup = async (req, res) => {
  try {
    const { firstName, lastName, age, email, address, password, phone } =
      req.body;

    const hashPassword = await bcrypt.hash(password, 10);

    const user = await User({
      firstName,
      lastName,
      age,
      email,
      address,
      phone,
      password: hashPassword,
    });

    // save to DB
    const savedUser = await user.save();

    // send response (whitelisted fields only)
    res.status(201).json({
      success: true,
      data: {
        id: savedUser._id,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        age: savedUser.age,
        email: savedUser.email,
        address: savedUser.address,
        phone: savedUser.phone,
      },
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered to another user.",
      });
    }
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = user.makeJWT();

    console.log(token, "Token")

    res.cookie("token", token);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong!",
    });
  }
};

const signout = (req, res) => {
  try {
    res.cookie("token", "", {
      expires: new Date(0),
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
};

module.exports = {
  signup,
  signin,
  signout,
};
