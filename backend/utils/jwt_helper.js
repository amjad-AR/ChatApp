// jwt/jwt_helper.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = "my_super_secret_key";

function createToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET
    // ❌ no expiresIn → token NEVER expires
  );
}

module.exports = { createToken, JWT_SECRET };
