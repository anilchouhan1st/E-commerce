const express = require('express');
const router = express.Router();
const {addCategory, getAllCategory, getCategoryById, updateCategoryById, deleteCategoryById} = require('../controllers/category-controller');

router.post('/add', addCategory);
router.get('/get', getAllCategory);
router.get('/get/:id', getCategoryById);
router.put('/update/:id', updateCategoryById);
router.delete('/delete/:id', deleteCategoryById);

module.exports = router; 