const express = require("express");
const { login, signup } = require("../controller/auth_controller");

const authRoute = express.Router();

authRoute.post("/login", login);
authRoute.post("/signup", signup);

module.exports = authRoute;
