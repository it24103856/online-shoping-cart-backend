import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    otp: {
        type: String,
        required: true
    },
    otpExpiry: {
        type: Date,
        required: true,
        index: { expires: '10m' } // Automatically deletes 10 mins after the expiry time
    }
});

const Otp = mongoose.model("Otp", OtpSchema);
export default Otp;