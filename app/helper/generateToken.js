import dotenv from "dotenv";
dotenv.config();
import jwt from 'jsonwebtoken'
export async function generateToken(userInfo) {
    // Payload containing user information
    const payload = {
      userInfo,
    };
  
    const options = {
      expiresIn: "24h", // Token expires in 24 hours
    };
  
    // Sign the JWT token with the payload and secret key
    const token = jwt.sign(payload, process.env.JWT_SECRET, options);
    return token;
  }