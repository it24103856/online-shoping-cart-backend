import mongoose from "mongoose";

const userSchema=new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    firstname:{
        type:String,
        required:true
    },
    lastname:{
        type:String,
        required:true
    },
    phone:{
        type:String,
        unique:true,
        sparse:true
    },
    address:{
        type:String,
        default:""

    },
    isblocked:{
        type:Boolean,
        default:false
    },

    role:{
        type:String,
        enum:["user","admin","driver"],
        default:"user"
    },
    image:{
        type:String,
        default:"/default.jpg"
    },
    
},{timestamps:true}

);

export default mongoose.model("User",userSchema)