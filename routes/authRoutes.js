const express = require("express");

const { signup, signin, signout } = require("../controllers/authContoller");

const { validateSignUpData } = require("../middlewares/authMiddleware");

const authRoutes = express.Router();

authRoutes.post("/signup", validateSignUpData, signup);

authRoutes.post("/signin", signin);

authRoutes.post("/signout", signout)

module.exports = authRoutes;
