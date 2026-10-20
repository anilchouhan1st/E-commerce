const express = require("express");
const router = express.Router();
const {
  placeOrder,
  getMyOrders,
  getOrderDetails,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} = require("../controllers/orderController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.post("/placeOrder", authMiddleware.protect, placeOrder);
router.get("/my-orders", authMiddleware.protect, getMyOrders);
router.get("/admin/all", authMiddleware.protect, adminMiddleware, getAllOrders);
router.patch(
  "/admin/:orderId/status",
  authMiddleware.protect,
  adminMiddleware,
  updateOrderStatus
);
router.patch("/:orderId/cancel", authMiddleware.protect, cancelOrder);
router.get("/:orderId", authMiddleware.protect, getOrderDetails);


module.exports = router;
