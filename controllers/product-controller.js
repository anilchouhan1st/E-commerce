const Product=require('../model/product');

getAllProduct = async(req,res)=>{
    try{
        const getAllProduct= await Product.find({});
        if(getAllProduct){
            res.status(200).json({
                success:true,
                message:"get all product",
                data:getAllProduct
            });
        }
        else{
            res.status(400).json({
                success:false,
                message:"can't get all product",
            });
        }
    }catch(e){
        console.log("Something wrong happen ",e);
    }
}
getProductById = async(req,res)=>{

}
addProduct = async(req,res)=>{
    try{
        const addDataform=req.body;
        const addProduct= await Product.create(addDataform);
        if(addProduct){
            res.status(201).json({
                success:true,
                message:"New product added",
                data:addProduct
            });
        }
        else{
            res.status(400).json({
                success:false,
                message:"can't be added product",
            });
        }
    }catch(e){
        console.log("Something wrong happen ",e);
    }

}
updateProductById = async(req,res)=>{

}
deleteProductById = async(req,res)=>{

}

module.exports = {getAllProduct,getProductById,addProduct,updateProductById,deleteProductById};