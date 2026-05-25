import  express from 'express';
import { createOrder, getOrderById, getallOrders, updateOrderStatus,deleteOrder,getMyOrders } from '../controllers/orderController.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';

const router=express.Router();

// create order
router.post('/',protect,createOrder);
router.post('/create',protect,createOrder);
router.get('/',protect,isAdmin,getallOrders);
// get all orders - admin only
router.get('/all',protect,isAdmin,getallOrders);
// get my orders - user only
router.get('/myorders',protect,getMyOrders);
// get order by id - admin or user
router.get('/:id',protect,getOrderById);
// update order status - admin only
router.put('/:id/status',protect,isAdmin,updateOrderStatus);
// delete order - admin only
router.delete('/:id',protect,isAdmin,deleteOrder);

export default router;
