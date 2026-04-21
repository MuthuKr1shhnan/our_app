const express = require("express");

const { profile } = require("../controllers/userController");

const userRoutes = express.Router();

userRoutes.get("/profile", profile);

module.exports =  userRoutes 
