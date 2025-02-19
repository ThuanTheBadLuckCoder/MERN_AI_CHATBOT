import User from "../models/User.js";
import { hash, compare } from "bcrypt";
import { createToken } from "../utils/token-manager.js";
import { COOKIE_NAME } from "../utils/constants.js";
import nodemailer from "nodemailer";
import dotenv from 'dotenv';
dotenv.config();
export const getAllUsers = async (req, res, next) => {
    try {
        //get all users
        const users = await User.find();
        return res.status(200).json({ message: "OK", users });
    }
    catch (error) {
        console.log(error);
        return res.status(200).json({ message: "ERROR", cause: error.message });
    }
};
export const userSignup = async (req, res, next) => {
    try {
        //user signup
        const { name, email, password } = req.body;
        console.log(name, email, password);
        const role = "User";
        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(401).send("User already registered");
        const hashedPassword = await hash(password, 10);
        const user = new User({ name, email, password: hashedPassword, role });
        await user.save();
        // create token and store cookie
        res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            domain: "localhost",
            signed: true,
            path: "/",
        });
        const token = createToken(user._id.toString(), user.email, "7d");
        const expires = new Date();
        expires.setDate(expires.getDate() + 7);
        res.cookie(COOKIE_NAME, token, {
            path: "/",
            domain: "localhost",
            expires,
            httpOnly: true,
            signed: true,
        });
        return res
            .status(201)
            .json({ message: "OK", name: user.name, email: user.email, role: user.role });
    }
    catch (error) {
        console.log(error);
        return res.status(401).json({ message: "ERROR", cause: error.message });
    }
};
export const userLogin = async (req, res, next) => {
    try {
        //user login
        const { email, password, remember } = req.body;
        console.log(remember);
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).send("User not registered");
        }
        const isPasswordCorrect = await compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(403).send("Incorrect Password");
        }
        // create token and store cookie
        res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            domain: "localhost",
            signed: true,
            path: "/",
        });
        // Set token expiration based on remember flag
        const tokenExpiration = remember ? "7d" : "1d"; // 7 days if remembered, 1 day if not
        const token = createToken(user._id.toString(), user.email, tokenExpiration);
        // Set cookie expiration based on remember flag
        const expires = new Date();
        if (remember) {
            expires.setDate(expires.getDate() + 7); // Add 7 days if remembered
        }
        else {
            // Cookie expires at end of session if not remembered
            expires.setDate(expires.getDate() + 1); // Add 1 day if not remembered
        }
        res.cookie(COOKIE_NAME, token, {
            path: "/",
            domain: "localhost",
            expires: remember ? expires : undefined, // If not remembered, cookie becomes a session cookie
            httpOnly: true,
            signed: true,
        });
        return res
            .status(200)
            .json({ message: "OK", name: user.name, email: user.email, role: user.role });
    }
    catch (error) {
        console.log(error);
        return res.status(200).json({ message: "ERROR", cause: error.message });
    }
};
export const verifyUser = async (req, res, next) => {
    try {
        //user token check
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }
        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        return res
            .status(200)
            .json({ message: "OK", name: user.name, email: user.email, role: user.role });
    }
    catch (error) {
        console.log(error);
        return res.status(200).json({ message: "ERROR", cause: error.message });
    }
};
export const userLogout = async (req, res, next) => {
    try {
        //user token check
        const user = await User.findById(res.locals.jwtData.id);
        if (!user) {
            return res.status(401).send("User not registered OR Token malfunctioned");
        }
        if (user._id.toString() !== res.locals.jwtData.id) {
            return res.status(401).send("Permissions didn't match");
        }
        res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            domain: "localhost",
            signed: true,
            path: "/",
        });
        return res
            .status(200)
            .json({ message: "OK", name: user.name, email: user.email });
    }
    catch (error) {
        console.log(error);
        return res.status(200).json({ message: "ERROR", cause: error.message });
    }
};
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
// Store OTPs with expiration (in memory - consider using Redis in production)
const otpStore = new Map();
// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});
transporter.verify(function (error, success) {
    if (error) {
        console.log("Transporter error:", error);
    }
    else {
        console.log("Server is ready to send emails");
    }
});
// Request password reset (send OTP)
export const requestPasswordReset = async (req, res, next) => {
    try {
        const { email } = req.body;
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Generate OTP
        const otp = generateOTP();
        // Store OTP with 15-minute expiration
        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + 15);
        otpStore.set(email, { otp, expires });
        // Email template
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Request",
            html: `
        <h1>Password Reset Request</h1>
        <p>Your OTP for password reset is: <strong>${otp}</strong></p>
        <p>This OTP will expire in 15 minutes.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
      `,
        };
        // Send email
        await transporter.sendMail(mailOptions);
        return res.status(200).json({
            message: "OTP sent successfully",
            expiresIn: "15 minutes"
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "ERROR",
            cause: error.message
        });
    }
};
// Verify OTP and reset password
export const resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        // Check if OTP exists and is valid
        const storedOTPData = otpStore.get(email);
        if (!storedOTPData) {
            return res.status(400).json({
                message: "No OTP request found. Please request a new OTP."
            });
        }
        // Check if OTP has expired
        if (new Date() > storedOTPData.expires) {
            otpStore.delete(email);
            return res.status(400).json({
                message: "OTP has expired. Please request a new one."
            });
        }
        // Verify OTP
        if (storedOTPData.otp !== otp) {
            return res.status(400).json({
                message: "Invalid OTP"
            });
        }
        // Hash new password
        const hashedPassword = await hash(newPassword, 10);
        // Update password in database
        await User.findOneAndUpdate({ email }, { password: hashedPassword });
        // Clear OTP from store
        otpStore.delete(email);
        return res.status(200).json({
            message: "Password reset successful"
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "ERROR",
            cause: error.message
        });
    }
};
// Cleanup expired OTPs periodically
setInterval(() => {
    const now = new Date();
    for (const [email, data] of otpStore.entries()) {
        if (now > data.expires) {
            otpStore.delete(email);
        }
    }
}, 15 * 60 * 1000);
//# sourceMappingURL=user-controllers.js.map