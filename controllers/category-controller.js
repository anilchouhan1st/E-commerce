const Category = require('../models/Category');

const addCategory = async(req,res)=>{
    try{
        const addDataform = req.body;
        const addCategory = await Category.create(addDataform);
        if(addCategory){
            res.status(201).json({
                success: true,
                message: "New category added",
                data: addCategory
            });
        }
    }catch(error){
        res.status(500).json({
            success: false,
            message: "can't add category",
        });
        console.log("Something wrong happen ", error);
    }
}

const getAllCategory = async(req,res)=>{
    try{
        const getAllCategory = await Category.find({});
        if(getAllCategory){
            res.status(200).json({
                success: true,
                message: "get all category",
                data: getAllCategory
            });
        }
    }catch(error){
        res.status(500).json({
            success: false,
            message: "can't get all category",
        });
        console.log("Something wrong happen ", error);
    }
}

const getCategoryById = async(req,res)=>{
    try{

        const currentId = req.params.id;
        const getCategoryById = await Category.findById(currentId);
        if(getCategoryById){
            res.status(200).json({
                success: true,
                message: "get category by id",
                data: getCategoryById
            });
        }
    }catch(error){
        res.status(500).json({
            success: false,
            message: "can't get the category try again with another id",
        });
        console.log("Something wrong happen ", error);
    }

}

const updateCategoryById = async(req,res)=>{
    try{
        const currentId = req.params.id;
        const updatebody=req.body;
        const updateCategoryById = await Category.findByIdAndUpdate(currentId,updatebody);
        if(updateCategoryById){
            res.status(200).json({
                success: true,
                message: "category updated successfully",
                data: updateCategoryById
            });
        }
    }catch(error){
        res.status(500).json({
            success: false,
            message: "can't update the category try again",
        });
        console.log("Something wrong happen ", error);
    }
}

const deleteCategoryById = async(req,res)=>{
    try{
        const currentId = req.params.id;
        const deleteCategoryById = await Category.findByIdAndDelete(currentId);
        if(deleteCategoryById){
            res.status(200).json({
                success: true,
                message: "category deleted successfully",
                data: deleteCategoryById
            });
        }
    }catch(error){
        res.status(500).json({
            success: false,
            message: "can't delete the category try again",
        });
        console.log("Something wrong happen ", error);
    }
}

module.exports = {addCategory, getAllCategory, getCategoryById, updateCategoryById, deleteCategoryById};