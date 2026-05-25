import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    // Keep legacy field for old DB unique index compatibility.
    orderId: {
        type: String,
        default: "",
    },
    orderID:{
        type: String,
        required: true,
        unique: false, // අද්විතීය නොවන orderID එකක් සලස්වයි (අපිට අවශ්‍ය විදිහට ID එක generate කරලා දීමට හැකියාව ලැබේ)
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required: true,
    },
    name:{
        type: String,
        required: true,
    },
    email:{
        type: String,
        required: true,
    },
    phone:{
        type: String,
        required: true,
    },
    address:{
        type: String,
        required: true,
    },
    items: [
        {
            productId: {
                type: String,
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
            },
            name:{
                type: String,
                required: true,
            },
            price:{
                type: Number,
                required: true,
            },
            image:{
                type: String,
            }
        }
    ],
    status: {
        type: String,
        required: true,
        enum: ['pending', 'processing', 'shipped', 'cancelled'], // වැරදි status වැටීම වළක්වයි
        default: "pending"
    },
    total: {
        type: Number,
        required: true,
    },
    notes: {
        type: String,
        default: ""
    }},{timestamps:true});

orderSchema.pre('validate', async function () {
    if (this.isNew && !this.orderID) {
        const year = new Date().getFullYear();
        const stamp = Date.now().toString().slice(-6);
        const randomNumber = Math.floor(100 + Math.random() * 900);
        this.orderID = `ORD-${year}-${stamp}${randomNumber}`;
    }

    // Mirror to legacy field so old unique index `orderId_1` does not receive null.
    if (!this.orderId) {
        this.orderId = this.orderID;
    }
});
const Order=mongoose.model("Order",orderSchema);

export default Order;