const mongoose = require("mongoose");
const Cart = require("../models/cartModel");
const Address = require("../models/addressModel");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");

const placeOrder = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const userId = req.user._id;
    const { addressId, paymentMethod } = req.body;

    if (!mongoose.isValidObjectId(addressId)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid address ID",
      });
    }

    if (paymentMethod !== "COD") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Only Cash on Delivery is currently supported",
      });
    }

    // 1. Fetch user cart within the transaction
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

    // 2. Verify address
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

    // 3. Process items, validate stock, and calculate subtotal
    let subtotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.product;

      if (!product) {
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

      // Check stock sufficiency
      if (product.stock < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
        });
      }

      // Decrement stock atomically within transaction
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: product._id, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { session, new: true }
      );

      if (!updatedProduct) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Stock conflict: ${product.name} is no longer available in the requested quantity.`,
        });
      }

      subtotal += price * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        price,
        quantity: item.quantity,
      });
    }

    subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

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

    // 4. Create Order
    const [order] = await Order.create(
      [
        {
          user: userId,
          items: orderItems,
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

    // 5. Empty the cart
    cart.items = [];
    await cart.save({ session });

    // Commit all operations together
    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

module.exports = { placeOrder };