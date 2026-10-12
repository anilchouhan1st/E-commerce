const express = require('express');
const router = express.Router();
const Cart = require('../models/cartModel');
const { addToCart, getCartByUserId, updateCartItem, removeCartItem,removeCart } = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');

// router.use(authMiddleware.attachUser);

router.post('/add',authMiddleware.protect, addToCart);
router.get('/get/:userId',authMiddleware.protect, getCartByUserId);
router.put('/update',authMiddleware.protect, updateCartItem);
router.delete('/remove/:userId/:itemId', authMiddleware.protect, removeCartItem);
router.delete('/remove/:userId', authMiddleware.protect, removeCart);


module.exports = router; 
