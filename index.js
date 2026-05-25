import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dns from "dns";
import jwt from "jsonwebtoken";


// import   routes
import userRouter from "./Routes/userRoutes.js";
import productRouter from "./Routes/productRoutes.js";
import orderRouter from "./Routes/orderRoutes.js";
import paymentRouter from "./Routes/paymentRouters.js";
import feedbackRouter from "./Routes/feedbackRoutes.js";
import reviewRouter from "./Routes/reviewRoutes.js";

dotenv.config();

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongourl= process.env.Mongo_Url;

mongoose.connect (mongourl, {
    family: 4,
}).then(() => {
    console.log("connected to database");
}).catch((err) => {
    console.log(err);
});

const app=express();
app.use(express.json());
app.use(cors());


app.use((req, res, next) => {
    const authorizationHeader = req.header("Authorization");
   
   if(authorizationHeader != null){
        const token = authorizationHeader.replace("Bearer ", "")
        console.log("Authorization Token:", token);

        try {
            const content = jwt.verify(token, process.env.JWT_SECRET);
            console.log("Token content:", content);
            req.user = content;
        } catch (error) {
            console.log("Invalid token:", error.message);
        }
    }
    next();
});

// routes
app.use("/api/users",userRouter);
app.use("/api/products",productRouter);
app.use("/api/orders",orderRouter);
app.use("/api/payments",paymentRouter);
app.use("/api/feedbacks",feedbackRouter);
app.use("/api/reviews",reviewRouter);


app.listen(3000,() => {
    console.log("server is running on port 3000");
});
