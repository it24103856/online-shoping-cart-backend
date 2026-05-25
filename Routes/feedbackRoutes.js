import express, {Router} from 'express';
import { createFeedback, getFeedback, deleteFeedback, updateFeedback,getAllFeedback ,getFeedbackStats} from '../controllers/feedbackController.js';
import { protect ,isAdmin} from '../middleware/authMiddleware.js';

const router=express.Router();
//create feedback

router.post('/create',protect, createFeedback);

//get feedback by user
router.get('/get', protect, getFeedback);

//update feedback
router.put('/update/:id', protect, updateFeedback);

//delete feedback
router.delete('/delete/:id', protect, deleteFeedback);


//get all feedbacks 
router.get('/get-all',  getAllFeedback);

//get feedback statistics for admin
router.get('/stats', protect, isAdmin, getFeedbackStats);

export default router;