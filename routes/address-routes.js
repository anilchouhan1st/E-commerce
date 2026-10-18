const express = require("express");
const router = express.Router();

const { addAddress,
  getAddresses,
  updateAddress,
  deleteAddress } = require("../controllers/addressController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/add", authMiddleware.protect, addAddress);
router.get("/get", authMiddleware.protect, getAddresses);
router.put("/update/:addressId", authMiddleware.protect, updateAddress);
router.delete("/delete/:addressId", authMiddleware.protect, deleteAddress);

module.exports = router;
