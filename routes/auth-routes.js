const express = require("express");
const authController = require('../controllers/authController');
const {protect} = require("../middleware/authMiddleware");
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetTokenValidation,
  resetPasswordValidation,
  changePasswordValidation,
  verificationTokenValidation,
} = require("../middleware/validationMiddleware");
const {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verificationLimiter,
} = require("../middleware/rateLimiterMiddleware");
const { doubleCsrfProtection } = require("../middleware/csrfMiddleware");
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
 protect,
  authController.changePasswordPage
);

router.post(
  "/change-password",
  protect,
  doubleCsrfProtection,
  changePasswordValidation,
  authController.changePassword
);

module.exports = router;