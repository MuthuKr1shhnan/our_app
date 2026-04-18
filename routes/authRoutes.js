const express = require("express");

const { signup } = require("../controllers/authContoller");

const { validateSignUpData } = require("../middlewares/authMiddleware");

const authRoutes = express.Router();

authRoutes.post("/signup", validateSignUpData, signup);

module.exports = authRoutes;
