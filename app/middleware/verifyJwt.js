import jwt from "jsonwebtoken"
import db from '../../db.js'
import { Op } from "sequelize";
import dotenv from "dotenv";
dotenv.config();
const secretKey = process.env.JWT_SECRET;
const verifyJWT = async (req, res, next) => {
    const {user} = db;
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(" ")[1];
    jwt.verify(token, secretKey, async (err, decoded) => {
        if (err)    
            return res
                .status(401)
                .json({ logoutUser: true, message: "Unauthorized" });
        const userID = decoded.userInfo.email;
        const userRole=decoded.userInfo.role;
        req.userID = userID;
        const foundUser = await user.findOne({
            where: { email: { [Op.eq]: userID } },
            raw: true,
        })
        if (!foundUser)
            return res.status(401).json({ message: 'Unauthorized' });
        req.user =foundUser
        next();
    });
};
export default verifyJWT
