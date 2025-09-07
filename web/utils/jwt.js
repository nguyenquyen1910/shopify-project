import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

export const generateToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: JWT_EXPIRES_IN,
  });

export const verifyToken = (token) =>
  jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
