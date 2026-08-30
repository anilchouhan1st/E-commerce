const rateLimit = require("express-rate-limit");

function createAuthLimiter(windowMs, max, message) {
  const isTestEnv = process.env.NODE_ENV === "test";

  return rateLimit({
    windowMs,
    
    max: isTestEnv ? 1000 : max,
    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res) => {
      return res.status(429).render("auth-status", {
        type: "error",
        title: "Too Many Requests",
        message,
        buttonText: "Back to Login",
        buttonLink: "/login",
      });
    },
  });
}

const loginLimiter = createAuthLimiter(
  15 * 60 * 1000,
  5,
  "Too many login attempts. Please try again after 15 minutes."
);

const registerLimiter = createAuthLimiter(
  60 * 60 * 1000,
  5,
  "Too many registration attempts. Please try again later."
);

const forgotPasswordLimiter = createAuthLimiter(
  60 * 60 * 1000,
  3,
  "Too many password-reset requests. Please try again later."
);

const resetPasswordLimiter = createAuthLimiter(
  15 * 60 * 1000,
  5,
  "Too many password-reset attempts. Please try again later."
);

const verificationLimiter = createAuthLimiter(
  15 * 60 * 1000,
  10,
  "Too many verification attempts. Please try again later."
);

module.exports = {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  verificationLimiter,
};