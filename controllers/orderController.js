const mongoose = require("mongoose");
const Cart = require("../models/cartModel");
const Address = require("../models/addressModel");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");

const orderFields =
  "items shippingAddress subtotal totalAmount paymentMethod paymentStatus orderStatus createdAt updatedAt";

const statusTransitions = {
  Placed: ["Confirmed", "Cancelled"],
  Confirmed: ["Shipped", "Cancelled"],
  Shipped: ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

const invalidId = (id) =>
  typeof id !== "string" || !mongoose.isValidObjectId(id);

const passOrderError = (error, res, next) => {
  if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError
  ) {
    return res.status(400).json({
      success: false,
      message: "Order data failed validation",
    });
  }

  return next(error);
};

const restockOrderItems = async (items, session) => {
  for (const item of items) {
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } },
      { session }
    );
  }
};

const placeOrder = async (req, res, next) => {
  const { addressId, paymentMethod } = req.body || {};

  if (invalidId(addressId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid address ID",
    });
  }

  if (paymentMethod !== "COD") {
    return res.status(400).json({
      success: false,
      message: "Only Cash on Delivery is currently supported",
    });
  }

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const userId = req.user._id;
    const address = await Address.findOne({
      _id: addressId,
      user: userId,
    }).session(session);

    if (!address) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Shipping address not found",
      });
    }

    const cart = await Cart.findOne({ user: userId })
      .populate("items.product")
      .session(session);

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      });
    }

    let subtotalInCents = 0;
    const items = [];

    for (const cartItem of cart.items) {
      const product = cartItem.product;
      const quantity = cartItem.quantity;

      if (!Number.isInteger(quantity) || quantity < 1) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Cart contains an invalid quantity",
        });
      }

      if (!product || !product.is_active) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "One or more products in your cart are no longer available",
        });
      }

      const price = Number(product.price);
      if (!Number.isFinite(price) || price < 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Invalid price configuration for ${product.name}`,
        });
      }

      const priceInCents = Math.round(price * 100);
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: product._id,
          is_active: true,
          stock: { $gte: quantity },
        },
        { $inc: { stock: -quantity } },
        { session }
      );

      if (!updatedProduct) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        });
      }

      subtotalInCents += priceInCents * quantity;
      items.push({
        product: product._id,
        name: product.name,
        price: priceInCents / 100,
        quantity,
      });
    }

    const shippingAddress = {
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || "",
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    };
    const subtotal = subtotalInCents / 100;

    const [order] = await Order.create(
      [
        {
          user: userId,
          items,
          shippingAddress,
          subtotal,
          totalAmount: subtotal,
          paymentMethod: "COD",
          paymentStatus: "Pending",
          orderStatus: "Placed",
        },
      ],
      { session }
    );

    cart.items = [];
    await cart.save({ session });
    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    return passOrderError(error, res, next);
  } finally {
    await session?.endSession();
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .select(orderFields)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    return next(error);
  }
};

const getOrderDetails = async (req, res, next) => {
  const { orderId } = req.params;
  if (invalidId(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID",
    });
  }

  try {
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    })
      .select(orderFields)
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({ success: true, order });
  } catch (error) {
    return next(error);
  }
};

const cancelOrder = async (req, res, next) => {
  const { orderId } = req.params;
  if (invalidId(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID",
    });
  }

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
      orderStatus: { $in: ["Placed", "Confirmed"] },
    }).session(session);

    if (order) {
      await restockOrderItems(order.items, session);
      order.orderStatus = "Cancelled";
      await order.save({ session });
      await session.commitTransaction();
      return res.status(200).json({
        success: true,
        message: "Order cancelled successfully",
        order,
      });
    }

    await session.abortTransaction();
    const existingOrder = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    }).select("orderStatus");

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(409).json({
      success: false,
      message: `Order cannot be cancelled while its status is ${existingOrder.orderStatus}`,
    });
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    return next(error);
  } finally {
    await session?.endSession();
  }
};

const getAllOrders = async (req, res, next) => {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    return res.status(400).json({
      success: false,
      message: "Page must be positive and limit must be between 1 and 100",
    });
  }

  try {
    const [orders, total] = await Promise.all([
      Order.find({})
        .select(`${orderFields} user`)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      orders,
    });
  } catch (error) {
    return next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  const { orderId } = req.params;
  const { orderStatus } = req.body || {};

  if (invalidId(orderId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order ID",
    });
  }

  if (!Object.prototype.hasOwnProperty.call(statusTransitions, orderStatus)) {
    return res.status(400).json({
      success: false,
      message: "Invalid order status",
    });
  }

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!statusTransitions[order.orderStatus].includes(orderStatus)) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: `Order cannot transition from ${order.orderStatus} to ${orderStatus}`,
      });
    }

    if (orderStatus === "Cancelled") {
      await restockOrderItems(order.items, session);
    }

    order.orderStatus = orderStatus;
    await order.save({ session });
    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    return next(error);
  } finally {
    await session?.endSession();
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderDetails,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};
