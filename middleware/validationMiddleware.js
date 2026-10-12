const { body, param, validationResult } = require("express-validator");

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{8,}$/;

function formErrorHandler(view, createViewData = () => ({})) {
  return (req, res, next) => {
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    return res.status(422).render(view, {
      ...createViewData(req),
      toast: {
        type: "error",
        title: "Invalid Information",
        message: errors.array()[0].msg,
      },
    });
  };
}

function invalidTokenPage(res, title, message) {
  return res.status(400).render("auth-status", {
    type: "error",
    title,
    message,
    buttonText: "Forgot Password",
    buttonLink: "/forgot-password",
  });
}

/* Registration */

const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters."),

  body("email")
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("Please enter a valid email address."),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .bail()
    .matches(passwordRegex)
    .withMessage(
      "Password must contain 8 characters, uppercase, lowercase, number, and special character."
    ),

  body("Confirm_password")
    .notEmpty()
    .withMessage("Please confirm your password.")
    .bail()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match.");
      }

      return true;
    }),

  formErrorHandler("register", () => ({ isRegister: true })),
];

/* Login */

const loginValidation = [
  body("email")
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("Please enter a valid email address."),

  body("password")
    .notEmpty()
    .withMessage("Password is required."),

  formErrorHandler("login", () => ({ isLogin: true })),
];

/* Forgot password */

const forgotPasswordValidation = [
  body("email")
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("Please enter a valid email address."),

  formErrorHandler("forgot-password"),
];

/* Shared reset-token validation */

const resetTokenValidation = [
  param("token")
    .matches(/^[a-f0-9]{64}$/i)
    .withMessage("This password-reset link is invalid."),

  (req, res, next) => {
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    return invalidTokenPage(
      res,
      "Reset Link Expired",
      "This password reset link is no longer valid."
    );
  },
];

/* Password reset submission */

const resetPasswordValidation = [
  body("password")
    .notEmpty()
    .withMessage("New password is required.")
    .bail()
    .matches(passwordRegex)
    .withMessage(
      "Password must contain 8 characters, uppercase, lowercase, number, and special character."
    ),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your new password.")
    .bail()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match.");
      }

      return true;
    }),

  formErrorHandler("reset-password", (req) => ({
    token: req.params.token,
  })),
];

/* Change password */

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required."),

  body("password")
    .notEmpty()
    .withMessage("New password is required.")
    .bail()
    .matches(passwordRegex)
    .withMessage(
      "Password must contain 8 characters, uppercase, lowercase, number, and special character."
    ),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your new password.")
    .bail()
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match.");
      }

      return true;
    }),

  formErrorHandler("change-password"),
];

/* Email-verification token */

const verificationTokenValidation = [
  param("token")
    .matches(/^[a-f0-9]{64}$/i)
    .withMessage("This verification link is invalid."),

  (req, res, next) => {
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    return invalidTokenPage(
      res,
      "Verification Failed",
      "This verification link is invalid or has expired."
    );
  },
];

module.exports = {
  passwordRegex,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetTokenValidation,
  resetPasswordValidation,
  changePasswordValidation,
  verificationTokenValidation,
};