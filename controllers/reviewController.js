import Review from "../models/Review.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

const getAuthUserId = async (req) => {
    if (req.user?._id) {
        return req.user._id.toString();
    }
    if (req.user?.id) {
        return req.user.id.toString();
    }
    if (req.user?.email) {
        const authUser = await User.findOne({ email: req.user.email }, "_id").lean();
        return authUser?._id?.toString() || null;
    }
    return null;
};


export const createReview = async (req, res) => {
    try {
        const { orderId, productId, rating, comment } = req.body;
        const userId = await getAuthUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!orderId || !productId || !rating || !comment) {
            return res.status(400).json({ success: false, message: "orderId, productId, rating and comment are required." });
        }

        // Verify order exists
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // Verify user owns this order
        if (order.userId && order.userId.toString() !== userId) {
            return res.status(403).json({ success: false, message: "You can only review your own orders." });
        }
        
        // Verify product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        // Verify order is delivered
        if (order.status !== "delivered") {
            return res.status(400).json({ success: false, message: "You can only review after your order has been delivered." });
        }

        // Verify product is part of this order
        const productInOrder = order.items.some((item) => item.productId?.toString() === productId);
        if (!productInOrder) {
            return res.status(400).json({ success: false, message: "This product is not part of the selected order." });
        }

        // Check if review already exists for this order and product
        const alreadyReviewed = await Review.findOne({ orderID: orderId, productID: productId, userID: userId });
        if (alreadyReviewed) {
            return res.status(400).json({ success: false, message: "You have already reviewed this item." });
        }

        // Create review
        const newReview = new Review({
            orderID: orderId,
            userID: userId,
            productID: productId,
            rating,
            comment
        });

        await newReview.save();

        // Update product rating (simple average)
        const allReviews = await Review.find({ productID: productId }, "rating").lean();
        const avgRating = allReviews.reduce((sum, rev) => sum + rev.rating, 0) / allReviews.length;
        await Product.findByIdAndUpdate(productId, { rating: Math.round(avgRating * 10) / 10 });

        res.status(201).json({ success: true, message: "Thank you! Your review has been submitted successfully." });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const reviews = await Review.find({ productID: productId })
            .populate("userID", "firstname lastname email")
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: reviews.length, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Backward-compatible alias for existing imports/routes.
export const getCakeReviews = getProductReviews;

export const getUserReviews = async (req, res) => {
    try {
        const { userId } = req.params;
        const reviews = await Review.find({ userID: userId })
            .populate("productID", "name")
            .populate("orderID", "total")
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: reviews.length, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = await getAuthUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found." });
        }

        // Check if user owns the review
        if (review.userID.toString() !== userId) {
            return res.status(403).json({ success: false, message: "Not authorized to delete this review." });
        }

        await Review.findByIdAndDelete(reviewId);
        res.status(200).json({ success: true, message: "Review deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markHelpful = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = await getAuthUserId(req);
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found." });
        }

        // Check if user already marked as helpful
        const alreadyHelpful = review.helpfulBy.some(id => id.toString() === userId);
        if (alreadyHelpful) {
            // Remove from helpful
            review.helpfulBy = review.helpfulBy.filter(id => id.toString() !== userId);
            review.helpfulVotes = Math.max(0, review.helpfulVotes - 1);
        } else {
            // Add to helpful
            review.helpfulBy.push(userId);
            review.helpfulVotes += 1;
        }

        await review.save();
        res.status(200).json({ success: true, data: review, message: alreadyHelpful ? "Removed from helpful" : "Marked as helpful" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};