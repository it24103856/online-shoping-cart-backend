import express from 'express';
import { createProduct, getAllProducts, getProductById, updateProduct, deleteProduct,searchProducts } from '../controllers/productController.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';

const router=express.Router();

router.post('/create',protect,isAdmin,createProduct);
router.get('/all',getAllProducts);
router.get('/search',searchProducts);
router.get('/:ProductID',getProductById);
router.put('/:ProductID',protect,isAdmin,updateProduct);
router.delete('/:ProductID',protect,isAdmin,deleteProduct);

export default router;