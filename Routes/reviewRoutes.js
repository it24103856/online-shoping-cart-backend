import express from "express";
import { 
    createReview, 
    getProductReviews,
    getCakeReviews,
    getUserReviews,
    deleteReview,
    markHelpful
} from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createReview);
router.get("/product/:productId", getProductReviews);
router.get("/cake/:cakeId", (req, res, next) => {
    req.params.productId = req.params.cakeId;
    return getCakeReviews(req, res, next);
});
router.get("/user/:userId", getUserReviews);
router.delete("/:reviewId", protect, deleteReview);
router.put("/:reviewId/helpful", protect, markHelpful);

export default router;