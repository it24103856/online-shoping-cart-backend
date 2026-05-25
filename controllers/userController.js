import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import axios from "axios";
import crypto from "crypto";
import Otp from "../models/Otp.js";
import User from "../models/User.js";
import { isAdmin } from "../middleware/authMiddleware.js";




const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, 
    },
    tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2"
    }
});


//register user

export const registerUser=async(req,res)=>{
    const data=req.body;
    const hashedPassword=await bcrypt.hashSync(req.body.password,10);
    const normalizedEmail = (data.email || "").trim().toLowerCase();


    const user=new User({
        email:normalizedEmail,
        password:hashedPassword,
        firstname:data.firstname,
        lastname:data.lastname,
        phone:data.phone,
        address:data.address,
        image:data.image || "/default.jpg"

    });
    user.save().then((user)=>{
        res.status(201).json({message:"User registered successfully",user})
    }).catch((err)=>{
        res.status(500).json({message:"Error registering user",err})
    }   
)
}

// normal login

export const loginUser=async(req,res)=>{
    const email=(req.body.email || "").trim().toLowerCase();
    const password=req.body.password;

    try {
        const user = await User.findOne({email});
        
        if(!user){
            return res.status(401).json({message:"Invalid email or password"});
        }
        
        if(user.isblocked){
            return res.status(403).json({message:"Your account is blocked. Please contact support."});
        }

        const isPasswordValid = bcrypt.compareSync(password, user.password);
        
        if(isPasswordValid){
            const payload={
                email:user.email,
                firstname:user.firstname,
                lastname:user.lastname,
                phone:user.phone,
                address:user.address,
                image:user.image,
                role:user.role
            };
            const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn:"8h"});
            return res.status(200).json({message:"Login successful", token, user:payload, role:user.role});
        } else {
            return res.status(401).json({message:"Invalid email or password"});
        }
    } catch(err) {
        console.error("Login error:", err);
        return res.status(500).json({message:"Error logging in", error: err.message});
    }
}

// google login

export async function googlelogin(req, res) {
    const accessToken = req.body.token || req.body.access_token || req.body.credential;
    if (!accessToken) return res.status(400).json({ message: "Missing Google access token" });

    try {
        console.log("Google login attempt with token:", accessToken.substring(0, 20) + "...");
        
        const response = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const googleUser = response.data;
        console.log("Google user info:", googleUser.email);
        const normalizedEmail = (googleUser.email || "").trim().toLowerCase();
        
        let user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            console.log("Creating new user from Google:", normalizedEmail);
            const randomPassword = crypto.randomBytes(32).toString("hex");
            const hashedPassword = bcrypt.hashSync(randomPassword, 10);
            user = new User({
                email: normalizedEmail,
                firstname: googleUser.given_name || googleUser.name || "Google",
                lastname: googleUser.family_name || "User",
                password: hashedPassword,
                image: googleUser.picture || "/default.jpg",
                phone: googleUser.sub,
                address: googleUser.locale || "Google account",
                isemailverified: true,
            });
            await user.save();
            console.log("User created:", normalizedEmail);
        }
        
        if(user.isblocked){
            return res.status(403).json({ message: "Your account is blocked. Please contact support." });
        }

        const payload = {
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            image: user.image,
            role: user.role,
            isemailverified: user.isemailverified,
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
        console.log("Token generated for:", user.email);
        return res.status(200).json({ message: "Login successful", token, user: payload, role: user.role });
    } catch (error) {
        console.error("Google login error:", error);
        return res.status(500).json({ message: "Google login failed", error: error.message });
    }
}


// get user details

export function getUser(req,res){
    const authHeader=req.headers.authorization;
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({message:"Unauthorized"})
    }
    const token=authHeader.split(" ")[1];
    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET);
        res.json(decoded)
    }
    catch(err){
        res.status(401).json({message:"Invalid token"})
    }

}

// send otp for password reset

export async function sendOtp(req,res){
    const email=req.body.email;

    try{
        const user=await User.findOne({email});
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        const generatedOtp=Math.floor(100000 + Math.random() * 900000).toString;
        const otpExpiry=new Date(Date.now()+10*60*1000);

        await Otp.findOneAndDelete({email:email});
    const newOtpEntry=new Otp({
        email:email,
        otp:generatedOtp,
        otpExpiry:otpExpiry
    })
    await newOtpEntry.save();

    const mailOptions={
        from:process.env.EMAIL_USER,
        to:email,
        subject:"OTP for password reset",
        text:`Your OTP is ${generatedOtp}. It will expire in 10 minutes.`

   
    }
    transporter.sendMail(mailOptions,(err,info)=>{
        if(err){
            console.error("Error sending OTP email:",err);
            return res.status(500).json({message:"Error sending OTP"})
        }
        res.json({message:"OTP sent successfully"})
    })
}catch(err){
    console.error("Error generating OTP:",err);
    return res.status(500).json({message:"Error generating OTP"})
}
}

// verify otp and reset password

export async function verifyOtp(req,res){
    try{
        const {email,otp,newPassword}=req.body;
        const otpEntry=await Otp.findOne({email:email,otp:otp});
        if(!otpEntry){
            return res.status(400).json({message:"Invalid OTP"})
        }
        await Otp.deleteOne({email:email,otp:otp});
       const hashedPassword=await bcrypt.hashSync(newPassword,10);
       await User.updateOne({email:email},{$set:{password:hashedPassword}});
         res.json({message:"Password reset successful"})

    }catch(err){
        console.error("Error verifying OTP:",err);
        return res.status(500).json({message:"Error verifying OTP"})
    }   
}

//update user status (block/unblock) - admin only

export async function updateUserStatus(req,res){
    if(!isAdmin(req,res)){
        return res.status(403).json({message:"Forbidden"})
    }
    const email=req.params.email;
    const isBlockedValue=req.body.isblocked;

    try{
        const result=await User.updateOne({email:email},{$set:{isblocked:isBlockedValue}});
        if(result.modifiedCount===0){
            return res.status(404).json({message:"User not found"})
        }
        res.json({message:"User status updated successfully"})
    }catch(err){
        console.error("Error updating user status:",err);
        return res.status(500).json({message:"Error updating user status"})
    }
    
}

//get all users - admin only
export async function getAllUsers(req,res){
    if(!isAdmin(req,res)){
        return res.status(403).json({message:"Forbidden"})
    }
    try{
        const users=await User.find({});
        res.json(users)
    }catch(err){
        console.error("Error fetching users:",err);
        return res.status(500).json({message:"Error fetching users"})
    }
    
}

// delete user - admin only
export async function deleteUser(req,res){
    if(!isAdmin(req,res)){
        return res.status(403).json({message:"Forbidden"})
    }
    const email=req.params.email;
    try{
        const result=await User.deleteOne({email:email});
        if(result.deletedCount===0){
            
            return res.status(404).json({message:"User not found"})


        }
        res.json({message:"User deleted successfully"})
    }catch(err){
        console.error("Error deleting user:",err);
        return res.status(500).json({message:"Error deleting user"})
    }

}

export const updateUser = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (user) {
            user.firstname = req.body.firstname || user.firstname;
            user.lastname = req.body.lastname || user.lastname;
            user.phone = req.body.phone || user.phone;
            user.address = req.body.address || user.address;
            user.image = req.body.image || user.image;
            user.role = req.body.role || user.role;

            const updatedUser = await user.save();
            res.json(updatedUser);
        } else {
            res.status(404).json({ message: "User not found" });
            
        }
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export async function updateUserRole(req, res) {
    const email=req.params.email;
    const newRole=req.body.role;

    try{
        const result=await User.updateOne({email:email},{$set:{role:newRole}});
        if(result.modifiedCount===0){
            return res.status(404).json({message:"User not found"})
        }
        res.json({message:"User role updated successfully"})
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
