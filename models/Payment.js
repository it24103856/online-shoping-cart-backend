import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    userEmail: {
        type: String,
        required: true
    },
    orderID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['Cash on Delivery', 'Bank Transfer', 'Online Transfer']
    },
    amount: {
        type: Number,
        required: true
    },
    // Used for Bank/Online transfers to store the receipt image path
    receiptImage: {
        type: String,
        default: null
    },
    // Reference number provided by the user for manual tracking
    referenceNumber: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ['Pending', 'Failed', 'Verified', 'Rejected'],
        default: 'Pending'
    },
    bankName: {
        type: String,
        default: ""
    },
    remark: {
        type: String,
        default: ""
    },
    transactionDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

paymentSchema.index({ userEmail: 1, createdAt: -1 });
paymentSchema.index({ orderID: 1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;