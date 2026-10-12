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

module.exports = { addAddress,getAddresses };