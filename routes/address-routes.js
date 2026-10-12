const express = require("express");
const router = express.Router();

const { addAddress } = require("../controllers/addressController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/add", authMiddleware.protect, addAddress);

module.exports = router;
