const express = require('express');
const {getAllProduct,getProductById,addProduct,updateProductById,deleteProductById} = require('../controllers/product-controller');

const router=express.Router();

router.get('/product/get',getAllProduct);
router.get('/product/get/:id',getProductById);
router.post('/product/add/',addProduct);
router.put('/product/update/:id',updateProductById);
router.delete('/product/delete/:id',deleteProductById);

module.exports = router; 
