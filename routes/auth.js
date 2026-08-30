const express = require("express");
const authController = require('../controllers/auth');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetTokenValidation,
  resetPasswordValidation,
  changePasswordValidation,
  verificationTokenValidation,
} = require("../middleware/validation");
const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verificationLimiter,
} = require("../middleware/rateLimiter");
const { doubleCsrfProtection } = require("../middleware/csrf");
const router = express.Router();

router.post(
  "/register",
  registerLimiter,
  doubleCsrfProtection,
  registerValidation,
  authController.register
);

router.post(
  "/login",
  loginLimiter,
  doubleCsrfProtection,
  loginValidation,
  authController.login
);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  doubleCsrfProtection,
  forgotPasswordValidation,
  authController.forgotPassword
);

router.get(
  "/verify/:token",
  verificationLimiter,
  verificationTokenValidation,
  authController.verifyEmail
);

router.get(
  "/reset-password/:token",
  resetTokenValidation,
  authController.resetPasswordPage
);

router.post(
  "/reset-password/:token",
  resetPasswordLimiter,
  doubleCsrfProtection,
  resetTokenValidation,
  resetPasswordValidation,
  authController.resetPassword
);

router.get(
  "/change-password",
  authController.protect,
  authController.changePasswordPage
);

router.post(
  "/change-password",
  authController.protect,
  doubleCsrfProtection,
  changePasswordValidation,
  authController.changePassword
);

module.exports = router;