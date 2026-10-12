const Product = require('../models/productModel');
const Category = require("../models/categoryModel");

const getAllProduct = async (req, res) => {
    try {
        const getAllProduct = await Product.find({ is_active: true }).populate('category_id', 'name');
        res.status(200).json({
            success: true,
            message: "get all product",
            data: getAllProduct
        });
    } catch (e) {
        console.log("Something wrong happen ", e);
        res.status(500).json({
            success: false,
            message: "can't get all product",
        });
    }
};

const getProductById = async (req, res) => {
    try {
        const currentId = req.params.id;
        const singleProduct = await Product.findById(currentId).populate('category_id', 'name');
        if (!singleProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        res.status(200).json({
            success: true,
            message: "get product by id",
            data: singleProduct
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "can't get the product try again with another id",
        });
    }
};
const addProduct = async (req, res) => {
    try {
        const category = await Category.findById(req.body.category_id);

        if (!category || !category.isActive) {
            return res.status(400).json({
                success: false,
                message: "Invalid or inactive category"
            });
        }
        const addDataform = req.body;
        const newProduct = await Product.create(addDataform);
        if (newProduct) {
            res.status(201).json({
                success: true,
                message: "New product added",
                data: newProduct
            });
        } else {
            res.status(400).json({
                success: false,
                message: "can't be added product",
            });
        }
    } catch (e) {
        console.log("Something wrong happen ", e);
        return res.status(500).json({
            success: false,
            message: "can't be added product",
        });
    }
};

const updateProductById = async (req, res) => {
    try {
        const updatebody = req.body;
        const currentId = req.params.id;
        const updatedProduct = await Product.findByIdAndUpdate(currentId, updatebody, { returnDocument: 'after' });
        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        res.status(200).json({
            success: true,
            message: "update product successfull",
            data: updatedProduct
        });
    } catch {
        res.status(500).json({
            success: false,
            message: "cant update",
        });
    }
};

const deleteProductById = async (req, res) => {
    try {
        const currentId = req.params.id;
        const deletedProduct = await Product.findByIdAndDelete(currentId);
        if (!deletedProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }
        res.status(200).json({
            success: true,
            message: "delete the product",
            data: deletedProduct
        });
    } catch (e) {
        console.log("Something wrong happen ", e);
        res.status(500).json({
            success: false,
            message: "can't delete product",
        });
    }
};

module.exports = { getAllProduct, getProductById, addProduct, updateProductById, deleteProductById };