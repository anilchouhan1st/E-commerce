const jwt = require("jsonwebtoken");
const User = require("../models/User");


exports.protect = async (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
      .select("_id is_verified is_active passwordChangedAt sessionVersion")
      .lean();

    if (!user) {
      res.clearCookie("jwt");
      return res.redirect("/login");
    }

    if (!user.is_active || (decoded.sessionVersion || 0) !== (user.sessionVersion || 0)) {
      res.clearCookie("jwt");
      return res.redirect("/login");
    }

    if (user.passwordChangedAt) {
      const passwordChangedAtSeconds = Math.floor(
        user.passwordChangedAt.getTime() / 1000
      );

      if (decoded.iat < passwordChangedAtSeconds) {
        res.clearCookie("jwt");
        return res.redirect("/login");
      }
    }

    req.user = {
      id: user._id.toString(),
      is_verified: user.is_verified,
    };

    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      res.clearCookie("jwt");
      return res.redirect("/login");
    }

    
    return next(error);
  }
};

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

