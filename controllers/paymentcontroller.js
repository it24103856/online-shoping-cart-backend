import Order from "../models/Order.js";
import Payment from "../models/Payment.js";
import mongoose from "mongoose";

// 1. Create Payment
export const createPayment = async (req, res) => {
    try {
        const { orderID, paymentMethod, amount, receiptImage, referenceNumber, bankName, transactionDate, remark } = req.body;
        const normalizedBankName = String(bankName || "").trim();
        const normalizedReference = String(referenceNumber || "").trim();
        const normalizedRemark = String(remark || "").trim();

        // User ඇතුළත් වී ඇත්දැයි බැලීම
        if (!req.user || !req.user.email) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!orderID || !paymentMethod || amount === undefined) {
            return res.status(400).json({ message: "Required fields are missing" });
        }

        if ((paymentMethod === 'Bank Transfer' || paymentMethod === 'Online Transfer') && !normalizedBankName) {
            return res.status(400).json({ message: "Bank name is required for transfer payments" });
        }

        if ((paymentMethod === 'Bank Transfer' || paymentMethod === 'Online Transfer') && !normalizedReference) {
            return res.status(400).json({ message: "Reference ID is required for transfer payments" });
        }

        if ((paymentMethod === 'Bank Transfer' || paymentMethod === 'Online Transfer') && !receiptImage) {
            return res.status(400).json({ message: "Receipt image is required for transfer payments" });
        }

        if ((paymentMethod === 'Bank Transfer' || paymentMethod === 'Online Transfer') && !transactionDate) {
            return res.status(400).json({ message: "Transfer date is required" });
        }

        const parsedTransactionDate = transactionDate ? new Date(transactionDate) : new Date();
        if (Number.isNaN(parsedTransactionDate.getTime())) {
            return res.status(400).json({ message: "Invalid transfer date" });
        }

        // Accept either Order _id or business orderID, then normalize to Order _id.
        let linkedOrder = null;
        if (mongoose.Types.ObjectId.isValid(orderID)) {
            linkedOrder = await Order.findById(orderID);
        }
        if (!linkedOrder) {
            linkedOrder = await Order.findOne({ orderID });
        }
        if (!linkedOrder) {
            // Backward compatibility for older records/flows using orderId field.
            linkedOrder = await Order.findOne({ orderId: orderID });
        }

        if (!linkedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Prevent duplicate payments for the same order.
        const existingPayment = await Payment.findOne({
            orderID: linkedOrder._id,
            status: { $in: ['Pending', 'Verified'] }
        });

        if (existingPayment) {
            return res.status(409).json({
                message: "This order already has a payment in progress or completed",
                payment: existingPayment
            });
        }

        // Users can create payments only for their own orders.
        if (linkedOrder.email !== req.user.email) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const newPayment = new Payment({
            userEmail: req.user.email,
            orderID: linkedOrder._id,
            paymentMethod,
            amount,
            receiptImage,
            referenceNumber: normalizedReference,
            bankName: normalizedBankName,
            transactionDate: parsedTransactionDate,
            remark: normalizedRemark
        });

        // Cash on Delivery නම් කෙලින්ම Verified ලෙස සලකුණු කිරීම
        if (paymentMethod === 'Cash on Delivery') {
            newPayment.status = 'Verified';
        }

        const savedPayment = await newPayment.save();

        res.status(201).json({
            success: true,
            message: "Payment created successfully",
            payment: savedPayment
        });
    } catch (error) {
        console.error("Create Payment Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

// 2. Get All Payments - Admin Only
export const getAllpayments = async (req, res) => {
    try {
        const payments = await Payment.find()
            .sort({ createdAt: -1 })
            .populate('orderID'); // Order එකේ විස්තර මෙතනට ගලා එයි

        res.status(200).json({ success: true, payments });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

// 3. Get Payment By Order ID
export const getPaymentByOrderId = async (req, res) => {
    try {
        const { id } = req.params;

        let orderObjectId = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            orderObjectId = id;
        } else {
            const order = await Order.findOne({ orderID: id }, "_id").lean();
            orderObjectId = order?._id || null;
        }

        if (!orderObjectId) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const payment = await Payment.findOne({ orderID: orderObjectId }).populate('orderID');

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }
        return res.status(200).json({ success: true, payment });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

// 4. Get My Payments - User Only
export const getMyPayments = async (req, res) => {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const email = req.user.email;
        
        // මුලින්ම Email එකෙන් payment සොයමු
        let payments = await Payment.find({ userEmail: email })
            .sort({ createdAt: -1 })
            .populate('orderID');

        // Email එකෙන් නැතිනම්, අදාළ Order IDs හරහා සෙවීම (Backup Logic)
        if (payments.length === 0) {
            const userOrders = await Order.find({ email: email }, "_id");
            const orderIds = userOrders.map((order) => order._id);
            payments = await Payment.find({ orderID: { $in: orderIds } })
                .sort({ createdAt: -1 })
                .populate('orderID');
        }

        res.status(200).json({ success: true, payments });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

// 5. Verify or Reject Payment - Admin Only
export const verifyPayment = async (req, res) => {
    try {
        const { paymentId, status } = req.body;
        const allowedStatus = ['Verified', 'Rejected'];

        if (!allowedStatus.includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        const updatedPayment = await Payment.findByIdAndUpdate(
            paymentId,
            { status },
            { new: true, runValidators: true }
        );

        if (!updatedPayment) {
            return res.status(404).json({ message: "Payment not found" });
        }

        // Keep order status values aligned with Order schema enum.
        if (status === "Verified") {
            await Order.findByIdAndUpdate(updatedPayment.orderID, { status: "processing" });
        } else if (status === "Rejected") {
            await Order.findByIdAndUpdate(updatedPayment.orderID, { status: "pending" });
        }

        res.status(200).json({ success: true, message: `Payment marked as ${status}`, payment: updatedPayment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Delete Payment
export const deletePayment = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedPayment = await Payment.findByIdAndDelete(id);

        if (!deletedPayment) {
            return res.status(404).json({ message: "Payment not found" });
        }
        res.status(200).json({ success: true, message: "Payment deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}