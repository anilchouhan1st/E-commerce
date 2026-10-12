const jwt = require("jsonwebtoken");
const User = require("../models/userModel");


exports.protect = async (req, res, next) => {
  const rejectAuth = (req, res) => {
    res.clearCookie("jwt");

    // Cart/API requests should receive JSON, not the login page
    if (req.originalUrl.startsWith("/cart")) {
      return res.status(401).json({
        success: false,
        message: "Please log in first"
      });
    }

    return res.redirect("/login");
  };

  const token = req.cookies.jwt;

  if (!token) {
    return rejectAuth(req, res);
  }

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id)
    .select("_id role is_verified is_active passwordChangedAt sessionVersion")
    .lean();

  if (!user) {
    return rejectAuth(req, res);
  }

  if (!user.is_active || (decoded.sessionVersion || 0) !== (user.sessionVersion || 0)) {
    return rejectAuth(req, res);
  }

  if (user.passwordChangedAt) {
    const passwordChangedAtSeconds = Math.floor(
      user.passwordChangedAt.getTime() / 1000
    );

    if (decoded.iat < passwordChangedAtSeconds) {
      return rejectAuth(req, res);
    }
  }

  req.user = {
    id: user._id.toString(),
    _id: user._id,
    role: user.role,
    is_verified: user.is_verified,
  };

  return next();
} catch (error) {
  if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
    return rejectAuth(req, res);
  }

  return next(error);
}
}


exports.attachUser = (req, res, next) => {
  res.locals.user = null;

  const token = req.cookies.jwt;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.locals.user = { id: decoded.id };
  } catch (error) {
    res.locals.user = null;
  }

  return next();
};
