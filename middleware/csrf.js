const { doubleCsrf } = require("csrf-csrf");

const {
  generateCsrfToken,
  doubleCsrfProtection,
  invalidCsrfTokenError,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET,
  getSessionIdentifier: (req) => req.cookies?.jwt || "anonymous",
  cookieName:
    process.env.NODE_ENV === "production"
      ? "__Host-psifi.x-csrf-token"
      : "psifi.x-csrf-token",
  cookieOptions: {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
  size: 64,
  getCsrfTokenFromRequest: (req) => req.body._csrf,
});

const attachCsrfToken = (req, res, next) => {
    res.locals.csrfToken = generateCsrfToken(req, res);
    next();
};

module.exports = {
  generateCsrfToken,
  doubleCsrfProtection,
  invalidCsrfTokenError,
  attachCsrfToken
};
