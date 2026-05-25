import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    feedback: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max:5,

    },

    category: {
        type: String,
        required: true,
        enum: ["cake", "acessories", "website", "services", "All"],
    },
    date: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true,

})


const Feedback = mongoose.model("Feedback", feedbackSchema);

export default Feedback;