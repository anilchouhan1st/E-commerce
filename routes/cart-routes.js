const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const { addToCart, getCartByUserId, updateCartItem, removeCartItem,removeCart } = require('../controllers/Cart-controller');
const authMiddleware = require('../middleware/auth-middleware');

// router.use(authMiddleware.attachUser);

router.post('/add',authMiddleware.protect, addToCart);
router.get('/get/:userId',authMiddleware.protect, getCartByUserId);
router.put('/update/:userId/:itemId', updateCartItem);
router.delete('/remove/:userId/:itemId', removeCartItem);
router.delete('/remove/:userId', removeCart);


module.exports = router; 
