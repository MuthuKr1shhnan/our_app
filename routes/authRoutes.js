const express = require("express");

const { signup, signin } = require("../controllers/authContoller");

const { validateSignUpData } = require("../middlewares/authMiddleware");

const authRoutes = express.Router();

authRoutes.post("/signup", validateSignUpData, signup);

authRoutes.post("/signin", signin);

module.exports = authRoutes;
