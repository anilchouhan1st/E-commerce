const mongoose = require("mongoose");
const Address = require("../models/addressModel");

const addAddress = async (req, res, next) => {
  //session is used for atomicity if session is fail then all the operation will be rollback
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country = "India", 
      addressType = "home",
      isDefault = false,
    } = req.body;

    const userId = req.user?._id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const existingCount = await Address.countDocuments({ user: userId }).session(session);

    const shouldBeDefault = existingCount === 0 ? true : Boolean(isDefault);

    if (shouldBeDefault && existingCount > 0) {
      await Address.updateMany(
        { user: userId, isDefault: true },
        { $set: { isDefault: false } },
        { session }
      );
    }

    const [address] = await Address.create(
      [
        {
          user: userId,
          fullName: fullName?.trim(),
          phone: phone?.trim(),
          addressLine1: addressLine1?.trim(),
          addressLine2: addressLine2?.trim(),
          city: city?.trim(),
          state: state?.trim(),
          postalCode: postalCode?.trim(),
          country: country?.trim(),
          addressType,
          isDefault: shouldBeDefault,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      address,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};


const getAddresses = async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const addresses = await Address.find({ user: userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: addresses.length,
      addresses,
    });
  } catch (error) {
    next(error);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { addressId } = req.params;

    // Validate MongoDB ObjectId format to prevent cast errors
    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID format",
      });
    }

    // 1. Delete only if it belongs to the authenticated user
    const deletedAddress = await Address.findOneAndDelete({
      _id: addressId,
      user: userId,
    });

    if (!deletedAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized",
      });
    }

    let newDefaultAddress = null;

    // 2. If the deleted address was the default, assign a new one
    if (deletedAddress.isDefault) {
      newDefaultAddress = await Address.findOneAndUpdate(
        { user: userId },
        { $set: { isDefault: true } },
        { sort: { createdAt: -1 }, new: true } // Picks the most recently created address
      );
    }

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      deletedAddressId: addressId,
      newDefaultAddressId: newDefaultAddress?._id || null,
    });
  } catch (error) {
    next(error);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const { addressId } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid address ID format",
      });
    }

    const allowedFields = [
      "fullName",
      "phone",
      "addressLine1",
      "addressLine2",
      "city",
      "state",
      "postalCode",
      "country",
      "addressType",
      "isDefault",
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update",
      });
    }

    // Check existing address state
    const existingAddress = await Address.findOne({
      _id: addressId,
      user: userId,
    });

    if (!existingAddress) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized",
      });
    }

    // Prevent manually demoting a default address to non-default
    // Users must designate another address as default instead
    if (existingAddress.isDefault && updateData.isDefault === false) {
      return res.status(400).json({
        success: false,
        message: "Cannot unset default address. Set another address as default instead.",
      });
    }

    // If making this address default, clear defaults on all other addresses
    if (updateData.isDefault === true && !existingAddress.isDefault) {
      await Address.updateMany(
        { user: userId, _id: { $ne: addressId } },
        { $set: { isDefault: false } }
      );
    }

    Object.assign(existingAddress, updateData);
    const updatedAddress = await existingAddress.save();

    return res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address: updatedAddress,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
};