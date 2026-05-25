import Order from "../models/Order.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";

// --- 1. Create Order (පාරිභෝගිකයා ඇණවුමක් සිදු කිරීම) ---
export async function createOrder(req, res) {
    try {
        const { name, email, phone, address, items = [], total, notes } = req.body;

        // පරිශීලකයා ලොග් වී ඇත්දැයි පරීක්ෂා කිරීම
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: Please login to place an order" });
        }

        // දුරකථන අංකය පිරිසිදු කිරීම (අංක පමණක් ඉතිරි කිරීම)
        const normalizedPhone = String(phone).replace(/\D/g, '');
        
        // සරල දුරකථන අංක Validation එකක් (ශ්‍රී ලංකාව සඳහා ඉලක්කම් 9/10)
        if (normalizedPhone.length < 9) {
            return res.status(400).json({ message: "Invalid phone number format" });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "Order must contain at least one item" });
        }

        const normalizedItems = items.map((item) => ({
            productId: item.productID || item.productId,
            quantity: Number(item.quantity) || 1,
            name: item.name || "Item",
            price: Number(item.price) || 0,
            image: item.image || ""
        }));

        const calculatedTotal = normalizedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const orderEmail = req.user?.email || email;

        if (!orderEmail) {
            return res.status(400).json({ message: "Email is required to place an order" });
        }

        const dbUser = await User.findOne({ email: orderEmail }).select("_id email");
        if (!dbUser) {
            return res.status(404).json({ message: "User not found for this order" });
        }

        const newOrder = new Order({
            userId: dbUser._id,
            name,
            email: dbUser.email,
            phone: normalizedPhone,
            address,
            items: normalizedItems,
            total: Number(total) || calculatedTotal,
            notes
        });

        const savedOrder = await newOrder.save();
        
        res.status(201).json({ 
            message: "Order placed successfully", 
            orderId: savedOrder.orderID,
            order: savedOrder 
        });

    } catch (error) {
        console.error("Create Order Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}

// --- 2. Get All Orders (Admin සඳහා පමණි) ---
export async function getallOrders(req, res) {
    try {
        // සියලුම ඇණවුම් ලබාගෙන, ඒවා කළ පරිශීලකයන්ගේ නම සහ ඊමේල් Populate කිරීම
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'firstname lastname email');

        return res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error fetching orders", error: error.message });
    }
}

// --- 3. Get Order By orderId (Admin හෝ අදාල පරිශීලකයා සඳහා) ---
export async function getOrderById(req, res) {
    const { id } = req.params;
    try {
        const order = await Order.findOne({ orderID: id })
            .populate('userId', 'firstname lastname email phone')
            .populate('items.productId');

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        return res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: "Error fetching order", error: error.message });
    }
}

// --- 4. Update Order Status (Admin සඳහා පමණි) ---
export async function updateOrderStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const normalizedStatus = String(status || "").toLowerCase();
        const allowedStatuses = ["pending", "processing", "shipped", "cancelled"];

        if (!allowedStatuses.includes(normalizedStatus)) {
            return res.status(400).json({ message: "Invalid order status" });
        }

        const order = await Order.findOne({ orderID: id });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Enforce workflow: shipping can happen only after processing.
        if (normalizedStatus === "shipped" && String(order.status).toLowerCase() !== "processing") {
            return res.status(400).json({ message: "Order must be Processing before marking as Shipped" });
        }

        order.status = normalizedStatus;
        await order.save();

        let paymentAutoConfirmed = false;
        // Business rule: when order is moved to Processing, confirm payment automatically.
        if (normalizedStatus === "processing") {
            const updatedPayment = await Payment.findOneAndUpdate(
                { orderID: order._id, status: { $in: ["Pending", "Failed"] } },
                { status: "Verified" },
                { new: true }
            );
            paymentAutoConfirmed = Boolean(updatedPayment);
        }

        return res.status(200).json({
            message: paymentAutoConfirmed
                ? "Order status updated and payment confirmed"
                : "Order status updated",
            order,
            paymentAutoConfirmed
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating status", error: error.message });
    }
}

// --- 5. Delete Order (Admin සඳහා පමණි) ---
export async function deleteOrder(req, res) {
    const { id } = req.params;
    try {
        const result = await Order.findOneAndDelete({ orderID: id });

        if (!result) {
            return res.status(404).json({ message: "Order not found" });
        }

        return res.status(200).json({ message: "Order deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting order", error: error.message });
    }
}

// --- 6. Get My Orders (පරිශීලකයාට තමාගේ ඇණවුම් බලාගැනීමට) ---
export async function getMyOrders(req, res) {
    try {
        const tokenUserId = req.user?._id || req.user?.id || req.user?.userId;

        let userIdToQuery = tokenUserId;
        if (!userIdToQuery && req.user?.email) {
            const dbUser = await User.findOne({ email: req.user.email }).select("_id");
            userIdToQuery = dbUser?._id;
        }

        if (!userIdToQuery) {
            return res.status(401).json({ message: "Unauthorized user context" });
        }

        const orders = await Order.find({ userId: userIdToQuery }).sort({ createdAt: -1 });
        return res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error fetching your orders", error: error.message });
    }
}