import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    orderID: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userID: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productID: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    helpfulVotes: { type: Number, default: 0 },
    helpfulBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

reviewSchema.index({ orderID: 1, productID: 1, userID: 1 }, { unique: true });
reviewSchema.index({ productID: 1, createdAt: -1 });
reviewSchema.index({ userID: 1, createdAt: -1 });

export default mongoose.model("Review", reviewSchema);