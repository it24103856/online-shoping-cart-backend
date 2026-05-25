import express from 'express';
import { registerUser, loginUser, googlelogin ,getUser,sendOtp,verifyOtp,updateUserRole,updateUserStatus,updateUser,getAllUsers,deleteUser, } from '../controllers/userController.js';
import { protect ,isAdmin} from '../middleware/authMiddleware.js';


const router = express.Router();

router.post('/register',registerUser);
router.post('/login',loginUser);
router.post('/googlelogin',googlelogin);
router.post('/google-login',googlelogin);
router.get('/',protect,getUser);
router.post('/sendotp/:email',sendOtp);
router.post('/verifyotp',verifyOtp);
router.put('/updatestatus/:email',isAdmin,updateUserStatus);
router.get('/allusers',isAdmin,getAllUsers);
router.delete('/deleteuser/:email',isAdmin,deleteUser);
router.put('/update-profile/:email', protect, updateUser);
router.put('/update-profile/:email', isAdmin, updateUserRole);


export default router;