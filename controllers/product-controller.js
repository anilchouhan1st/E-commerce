const Product = require('../model/product');

getAllProduct = async (req, res) => {
    try {
        const getAllProduct = await Product.find({});
        res.status(200).json({
            success: true,
            message: "get all product",
            data: getAllProduct
        });
    } catch (e) {
        console.log("Something wrong happen ", e),
            res.status(500).json({
                success: false,
                message: "can't get all product",
            })
    }
    
}
getProductById = async (req, res) => {
try{
const currentId = req.params.id;
const singleProduct = await Product.findById(currentId);
 res.status(200).json({
            success: true,
            message: "get all product",
            data: singleProduct
        });
}catch{
 res.status(500).json({
                success: false,
                message: "can't get the product try again with another id",
            })
}
}
addProduct = async (req, res) => {
    try {
        const addDataform = req.body;
        const addProduct = await Product.create(addDataform);
        if (addProduct) {
            res.status(201).json({
                success: true,
                message: "New product added",
                data: addProduct
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: "can't be added product",
            });
        }
    } catch (e) {
        console.log("Something wrong happen ", e);
    }

}
updateProductById = async (req, res) => {
try{
const updatebody=req.body;
const currentId = req.params.id;
const updateProduct = await Product.findByIdAndUpdate(currentId,updatebody);
 res.status(200).json({
            success: true,
            message: "update product successfull",
            data: updatebody
        });
}catch{
 res.status(500).json({
                success: false,
                message: "cant update",
            })
}
}
deleteProductById = async (req, res) => {
try{
const currentId=req.params.id;
const deleteProduct = await Product.findByIdAndDelete(currentId)
 res.status(200).json({
            success: true,
            message: "delete the product",
            data: deleteProduct
        });
}catch (e) {
        console.log("Something wrong happen ", e),
            res.status(500).json({
                success: false,
                message: "can't delete product",
            })
    }
}

module.exports = { getAllProduct, getProductById, addProduct, updateProductById, deleteProductById };