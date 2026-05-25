import Feedback from "../models/Feedback.js";

// 1. Create Feedback
export const createFeedback = async (req, res) => {
    try {
        const { feedback, rating, category } = req.body;
        const newFeedback = new Feedback({
            userID: req.user.id, 
            feedback,
            rating,
            category,
        });
        await newFeedback.save();
        return res.status(201).json({ message: "Feedback submitted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Error submitting feedback", error: error.message });
    }
};

// 2. Get Feedback (For Logged-in User)
export const getFeedback = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Schema has 'userId' not 'user'
        const feedbacks = await Feedback.find({ userID: req.user.id })
            .populate("userID", "firstName lastName email")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const totalFeedbacks = await Feedback.countDocuments({ userID: req.user.id });
        const totalPages = Math.ceil(totalFeedbacks / limit);

        // Send only one JSON here (don't send res twice)
        return res.status(200).json({ 
            feedbacks, 
            totalPages, 
            currentPage: page 
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching feedback", error: error.message });
    }
};

// 3. Get All Feedbacks (For Admin)
export const getAllFeedback = async (req, res) => {
    try {
        const { page = 1, limit = 10, category, rating } = req.query;
        const query = {};
        if (category) query.category = category;
        if (rating) query.rating = rating;

        const feedbacks = await Feedback.find(query)
            .populate("userID", "firstName lastName email image")
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        const totalFeedbacks = await Feedback.countDocuments(query);
        
        return res.status(200).json({ 
            feedbacks, 
            totalPages: Math.ceil(totalFeedbacks / limit), 
            currentPage: page 
        });
    } catch (error) {
        return res.status(500).json({ message: "Error fetching feedback", error: error.message });
    }
};

// 4. Update Feedback
export const updateFeedback = async (req, res) => {
    try {
        const { id } = req.params; // Route has :id like this
        const { feedback, rating, category } = req.body;
        const updatedFeedback = await Feedback.findOneAndUpdate(
            { _id: id, userID: req.user.id },
            { feedback, rating, category },
            { new: true }
        );
        return res.status(200).json({ message: "Feedback updated successfully", updatedFeedback });
    } catch (error) {
        return res.status(500).json({ message: "Error updating feedback", error: error.message });
    }
};

// 5. Delete Feedback
export const deleteFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        await Feedback.findOneAndDelete({ _id: id, userID: req.user.id });
        return res.status(200).json({ message: "Feedback deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Error deleting feedback", error: error.message });
    }
};

// 6. Get Stats (Admin)
export const getFeedbackStats = async (req, res) => {
    try {
        const stats = await Feedback.aggregate([{ $group: { _id: '$rating', count: { $sum: 1 } } }]);
        const categoryStats = await Feedback.aggregate([{ $group: { _id: '$category', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } }]);
        const overallStats = await Feedback.aggregate([{ $group: { _id: null, totalFeedback: { $sum: 1 }, avgRating: { $avg: '$rating' } } }]);

        return res.json({
            success: true,
            stats: {
                rating: stats,
                category: categoryStats,
                overall: overallStats[0] || { totalFeedback: 0, avgRating: 0 }
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error fetching statistics', error: error.message });
    }
};