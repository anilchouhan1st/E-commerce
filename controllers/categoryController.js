const Category = require('../models/categoryModel');

const addCategory = async (req, res) => {
    try {
        const addDataform = req.body;
        const newCategory = await Category.create(addDataform);
        if (newCategory) {
            res.status(201).json({
                success: true,
                message: "New category added",
                data: newCategory
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "can't add category",
        });
        console.log("Something wrong happen ", error);
    }
};

const getAllCategory = async (req, res) => {
    try {
        const allCategories = await Category.find({});
        res.status(200).json({
            success: true,
            message: "get all category",
            data: allCategories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "can't get all category",
        });
        console.log("Something wrong happen ", error);
    }
};

const getCategoryById = async (req, res) => {
    try {
        const currentId = req.params.id;
        const category = await Category.findById(currentId);
        if (category) {
            return res.status(200).json({
                success: true,
                message: "get category by id",
                data: category
            });
        }
        return res.status(404).json({
            success: false,
            message: "Category not found",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "can't get the category try again with another id",
        });
        console.log("Something wrong happen ", error);
    }
};

const updateCategoryById = async (req, res) => {
    try {
        const currentId = req.params.id;
        const updatebody = req.body;
        const updatedCategory = await Category.findByIdAndUpdate(currentId, updatebody, { returnDocument: 'after' });
        if (updatedCategory) {
            return res.status(200).json({
                success: true,
                message: "category updated successfully",
                data: updatedCategory
            });
        }
        return res.status(404).json({
            success: false,
            message: "Category not found",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "can't update the category try again",
        });
        console.log("Something wrong happen ", error);
    }
};

const deleteCategoryById = async (req, res) => {
    try {
        const currentId = req.params.id;
        const deletedCategory = await Category.findByIdAndDelete(currentId);
        if (deletedCategory) {
            return res.status(200).json({
                success: true,
                message: "category deleted successfully",
                data: deletedCategory
            });
        }
        return res.status(404).json({
            success: false,
            message: "Category not found",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "can't delete the category try again",
        });
        console.log("Something wrong happen ", error);
    }
};

module.exports = {addCategory, getAllCategory, getCategoryById, updateCategoryById, deleteCategoryById};