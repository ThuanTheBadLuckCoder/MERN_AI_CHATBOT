import mongoose, { model } from "mongoose";
import { randomUUID } from "crypto";

const otpSchema = new mongoose.Schema({
    id: {
        type: String,
        default: randomUUID(),
    },
    email: {
        type: String,
        require: true,
    },
    otp: {
        type: String,
        require: true
    },
    createAt: {
        type: Date,
        default: function () {
            // Set expiration time to 5 minutes from creation
            return new Date(Date.now() + 5 * 60 * 1000);
        }
    },
    isUsed: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });

// Add a method to check if OTP is valid (not expired and not used)
otpSchema.methods.isValid = function() {
    return !this.isUsed && this.expiresAt > new Date();
};
// Add TTL index to automatically remove expired documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("OTP", otpSchema);