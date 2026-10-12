const Cart = require("../models/cartModel");
const Product = require("../models/productModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");


const addToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity } = req.body;
        const parsedQuantity = Number(quantity);

        if (
            (typeof quantity !== "number" && typeof quantity !== "string") ||
            String(quantity).trim() === "" ||
            !Number.isInteger(parsedQuantity) ||
            parsedQuantity <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive integer",
            });
        }

        if (typeof productId !== "string" || !mongoose.isValidObjectId(productId)) {
            return res.status(400).json({
                success: false,
                message: "A valid productId is required",
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({
                user: userId,
                items: [],
            });
        }

        const existingItem = cart.items.find(
            (item) => item.product.toString() === productId
        );

        if (existingItem) {
            existingItem.quantity += parsedQuantity;
        } else {
            cart.items.push({
                product: productId,
                quantity: parsedQuantity,
            });
        }

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Item added to cart",
            cart,
        });

    } catch (error) {
        console.error("Failed to add item to cart:", error);

        return res.status(500).json({
            success: false,
            message: "Can't add to cart",
        });
    }
};


const getCartByUserId = async (req, res) => {
    try {
        const userId = req.params.userId;

        if (req.user && req.user.role !== "admin" && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only view your own cart."
            });
        }

        const cart = await Cart.findOne({ user: userId })
            .populate("items.product");

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found for this user"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Cart retrieved successfully",
            data: cart
        });

    } catch (error) {
        console.error("Something went wrong:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve cart"
        });
    }
};


const updateCartItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user?.id || req.user?._id;

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
      });
    }

    // Find the user's cart
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Find the product inside the cart
    const cartItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: "Product not found in cart",
      });
    }

    // Update quantity
    cartItem.quantity = quantity;

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated successfully",
      cart,
    });
  } catch (error) {
    next(error);
  }
};

const removeCartItem = async (req, res) => {
    try {
        const userId = req.params.userId;
        const itemId = req.params.itemId;

        if (req.user && req.user.role !== "admin" && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only modify your own cart."
            });
        }

        const updatedCart = await Cart.findOneAndUpdate(
            { user: userId },
            { $pull: { items: { _id: itemId } } },
            { returnDocument: 'after' }
        );

        if (!updatedCart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found for this user",
            });
        }

        return res.status(200).json({
            success: true,
            message: "cart item removed",
            data: updatedCart
        });
    } catch (error) {
        console.log("Something wrong happen ", error);
        return res.status(500).json({
            success: false,
            message: "can't remove the cart item try again with another id",
        });
    }
};

const removeCart = async (req, res) => {
    try {
        const userId = req.params.userId;

        if (req.user && req.user.role !== "admin" && req.user.id !== userId) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only modify your own cart."
            });
        }

        const deletedCart = await Cart.findOneAndDelete({ user: userId });

        if (!deletedCart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found for this user",
            });
        }

        return res.status(200).json({
            success: true,
            message: "cart removed",
            data: deletedCart
        });
    } catch (error) {
        console.log("Something wrong happen ", error);
        return res.status(500).json({
            success: false,
            message: "can't remove the cart try again with another id",
        });
    }
};

module.exports = { addToCart, getCartByUserId, updateCartItem, removeCartItem, removeCart };