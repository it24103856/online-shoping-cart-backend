import express from 'express';
import { createPayment, getAllpayments,getPaymentByOrderId,getMyPayments,verifyPayment,deletePayment } from '../controllers/paymentcontroller.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Create Payment - User Only
router.post('/create', protect, createPayment);
// 2. Get All Payments - Admin Only
router.get('/all', protect, isAdmin, getAllpayments);
// 3. Get Payment By Order Id - Admin Only
router.get('/order/:id', protect, isAdmin, getPaymentByOrderId);
// 4. Get My Payments - User Only
router.get('/my', protect, getMyPayments);
// 5. Verify Payment - Admin Only
router.post('/verify', protect, isAdmin, verifyPayment);

// 6. Delete Payment - Admin Only
router.delete('/:id', protect, isAdmin, deletePayment);

export default router;
