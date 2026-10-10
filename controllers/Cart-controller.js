const Cart = require("../models/Cart");
const Product = require("../models/Product");
const User = require("../models/User");
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

const updateCartItem = async (req, res) => {
    try{
    const UserId = req.params.userId;
    const ItemId = req.params.itemId;
    const updateBody = req.body;
    const updateCartItem = await Cart.findByIdAndUpdate(UserId,updateBody);
    if(updateCartItem){
        res.status(200).json({
            success: true,
            message: "cart item updated",
            data: updateCartItem
        });
    }
    }catch(error){
        res.status(500).json({
            success: false,
            message: "can't update the cart item try again with another id",
        });
        console.log("Something wrong happen ", error);
    }
}

const removeCartItem = async (req, res) => {
    try{
        const UserId = req.params.userId;
        const ItemId = req.params.itemId;
        const removeCartItem = await Cart.findByIdAndUpdate(UserId, { $pull: { items: { _id: ItemId } } });
        if(removeCartItem){
            res.status(200).json({
                success: true,
                message: "cart item removed",
                data: removeCartItem
            });
        }
    }catch(error){
        res.status(500).json({
            success: false,
            message: "can't remove the cart item try again with another id",
        });
        console.log("Something wrong happen ", error);
    }
}

const removeCart = async (req, res) => {
    try{
        const UserId = req.params.userId;
        const removeCart = await Cart.findByIdAndDelete(UserId);
        if(removeCart){
            res.status(200).json({
                success: true,
                message: "cart removed",
                data: removeCart
            });
        }
    }catch(error){
        res.status(500).json({
            success: false,
            message: "can't remove the cart try again with another id",
        });
        console.log("Something wrong happen ", error);
    }
}

module.exports = { addToCart, getCartByUserId, updateCartItem, removeCartItem, removeCart };