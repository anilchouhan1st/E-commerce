const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    is_verified: {
      type: Boolean,
      default: false,
    },

    is_active: {
      type: Boolean,
      default: true,
    },

    verification_token: {
      type: String,
      index: true,
    },

    verification_expires: {
      type: Date,
    },

    reset_token: {
      type: String,
      index: true,
    },

    reset_expires: {
      type: Date,
    },

    passwordChangedAt: {
      type: Date,
    },

    sessionVersion: {
      type: Number,
      default: 0,
    },

    last_login: {
      type: Date,
    },

    login_attempts: {
      type: Number,
      default: 0,
    },

    lock_until: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;