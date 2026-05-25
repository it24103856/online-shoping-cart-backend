import mongoose from "mongoose";    

const productSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        
        type: Number,
        required: true,
    },
    labeledPrice: {
        type: Number,
        required: true,
    },
    image: {
        type: [String],
        required: true,
        default: []
    },
    altName: {
        type: [String],
        default: []
    },
    isAvailable: {
        type: Boolean,
        required: true,
        default: true
    },
    category: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
        required: true,
        default: "Generic",
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
    },
    rating: {
        type: Number,
        required: true,
        default: 0,
    },
    reviews: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "Review",
        default: []
    },
    createdDate: {
        type: Date,
        default: Date.now,
    },
    expireDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        required: true,
        default: "Available",
    },
   
},{timestamps: true}

);

const Product = mongoose.model("Product", productSchema);

export default Product;