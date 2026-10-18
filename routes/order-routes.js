const express = require('express');
const router = express.Router();
const {placeOrder}=require('../controllers/orderController');
const authMiddleware=require('../middleware/authMiddleware');

router.post('/add',authMiddleware.protect,placeOrder);

module.exports = router;
