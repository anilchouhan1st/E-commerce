const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const transporter = require("../config/mail");
const User = require("../models/User");
const { passwordRegex } = require("../middleware/validation");

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function parseDurationToMs(duration) {
  if (typeof duration === "number") {
    return duration * 1000;
  }

  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(String(duration).trim());

  if (!match) {
    return 24 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unitToMs = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * unitToMs[match[2].toLowerCase()];
}

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

exports.verifyEmail = async (req, res, next) => {
  try {
    const token = req.params.token;
    const tokenHash = hashToken(token);

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.render("auth-status", {
        type: "error",
        title: "Verification Failed",
        message: "This verification link is invalid or has expired.",
        buttonText: "Register Again",
        buttonLink: "/register",
      });
    }

    const user = await User.findOneAndUpdate(
      {
        verification_token: tokenHash,
        verification_expires: { $gt: new Date() },
        is_verified: false,
      },
      {
        $set: {
          is_verified: true,
          verification_token: null,
          verification_expires: null,
        },
      },
      {
        new: true,
      }
    );

    if (!user) {
      return res.render("auth-status", {
        type: "error",
        title: "Verification Failed",
        message: "This verification link is invalid or has expired.",
        buttonText: "Register Again",
        buttonLink: "/register",
      });
    }

    return res.render("auth-status", {
      type: "success",
      title: "Email Verified",
      message: "Your email has been verified successfully.",
      buttonText: "Login Now",
      buttonLink: "/login",
    });
  } catch (error) {
    return next(error);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, Confirm_password } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedName = name?.trim();

    if (!normalizedName || !normalizedEmail || !password || !Confirm_password) {
      return res.render("register", {
        isRegister: true,
        toast: {
          type: "error",
          title: "Missing information",
          message: "Please fill in all fields.",
        },
      });
    }

    if (password !== Confirm_password) {
      return res.render("register", {
        isRegister: true,
        toast: {
          type: "error",
          title: "Error",
          message: "Passwords do not match.",
        },
      });
    }

    if (!passwordRegex.test(password)) {
      return res.render("register", {
        isRegister: true,
        toast: {
          type: "warning",
          title: "Weak Password",
          message: "Password does not meet the required criteria.",
        },
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.render("register", {
        isRegister: true,
        toast: {
          type: "error",
          title: "Email Exists",
          message: "An account with this email already exists.",
        },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = hashToken(verificationToken);
    const verificationExpires = new Date(Date.now() + 60 * 60 * 1000);

    await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      is_verified: false,
      verification_token: verificationTokenHash,
      verification_expires: verificationExpires,
    });

    const verificationLink =
      `${process.env.BASE_URL}/auth/verify/${verificationToken}`;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: normalizedEmail,
        subject: "Verify Your Email",
        html: `
          <h2>Welcome ${normalizedName}!</h2>
          <p>Please verify your email address.</p>
          <a href="${verificationLink}">Verify Email</a>
          <p>This link expires in 1 hour.</p>
        `,
      });
    } catch (mailError) {
    
      console.error(
        `Failed to send verification email to ${normalizedEmail}:`,
        mailError
      );
    }

    return res.render("register", {
      isRegister: true,
      toast: {
        type: "info",
        title: "Verification Sent",
        message: "Please check your email to verify your account.",
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.render("login", {
        isLogin: true,
        toast: {
          type: "error",
          title: "Missing information",
          message: "Please enter your email and password.",
        },
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    const invalidLoginResponse = () =>
      res.render("login", {
        isLogin: true,
        toast: {
          type: "error",
          title: "Login failed",
          message: "Invalid email or password.",
        },
      });

    if (!user) {
      return invalidLoginResponse();
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return invalidLoginResponse();
    }

    if (!user.is_verified) {
      return res.render("login", {
        isLogin: true,
        toast: {
          type: "error",
          title: "Email verification required",
          message: "Please verify your email before logging in.",
        },
      });
    }

    if (!user.is_active) {
      return invalidLoginResponse();
    }

    const rememberMe = req.body.rememberMe === "on" || req.body.rememberMe === "true";

    const sessionDuration = rememberMe
      ? process.env.REMEMBER_ME_EXPIRES_IN || "30d"
      : process.env.JWT_EXPIRES_IN || "1d";

    const sessionDurationMs = parseDurationToMs(sessionDuration);

    const token = jwt.sign(
      { id: user._id.toString(), sessionVersion: user.sessionVersion || 0 },
      process.env.JWT_SECRET,
      { expiresIn: Math.floor(sessionDurationMs / 1000) }
    );

    res.cookie("jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: sessionDurationMs,
    });

    return res.redirect("/dashboard?welcome=true");
  } catch (error) {
    return next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const normalizedEmail = req.body.email?.trim().toLowerCase();

    const responseData = {
      type: "info",
      title: "Check Your Email",
      message:
        "If an account matches this email address, we sent password reset instructions.",
      buttonText: "Back to Login",
      buttonLink: "/login",
    };

    if (!normalizedEmail) {
      return res.render("auth-status", responseData);
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.render("auth-status", responseData);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = hashToken(resetToken);

    user.reset_token = resetTokenHash;
    user.reset_expires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetLink =
      `${process.env.BASE_URL}/auth/reset-password/${resetToken}`;

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Reset Your Password",
        html: `
          <h2>Password Reset Request</h2>
          <p>Click the link below to reset your password.</p>
          <a href="${resetLink}">Reset Password</a>
          <p>This link expires in 1 hour.</p>
          <p>If you did not request this, you can ignore this email.</p>
        `,
      });
    } catch (mailError) {
    
      console.error(
        `Failed to send password-reset email to ${user.email}:`,
        mailError
      );
    }

    return res.render("auth-status", responseData);
  } catch (error) {
    return next(error);
  }
};

exports.resetPasswordPage = async (req, res, next) => {
  try {
    const token = req.params.token;
    const tokenHash = hashToken(token);

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.render("auth-status", {
        type: "error",
        title: "Reset Link Expired",
        message: "This password reset link is no longer valid.",
        buttonText: "Forgot Password",
        buttonLink: "/forgot-password",
      });
    }

    const user = await User.findOne({
      reset_token: tokenHash,
      reset_expires: { $gt: new Date() },
    })
      .select("_id")
      .lean();

    if (!user) {
      return res.render("auth-status", {
        type: "error",
        title: "Reset Link Expired",
        message: "This password reset link is no longer valid.",
        buttonText: "Forgot Password",
        buttonLink: "/forgot-password",
      });
    }

    return res.render("reset-password", {
      token,
    });
  } catch (error) {
    return next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const token = req.params.token;
    const tokenHash = hashToken(token);
    const { password, confirmPassword } = req.body;

    const renderResetForm = (toast) =>
      res.render("reset-password", {
        token,
        toast,
      });

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.render("auth-status", {
        type: "error",
        title: "Reset Link Expired",
        message: "This password reset link is no longer valid.",
        buttonText: "Forgot Password",
        buttonLink: "/forgot-password",
      });
    }

    if (!password || !confirmPassword) {
      return renderResetForm({
        type: "error",
        title: "Missing information",
        message: "Please enter and confirm your new password.",
      });
    }

    if (password !== confirmPassword) {
      return renderResetForm({
        type: "error",
        title: "Error",
        message: "Passwords do not match.",
      });
    }

    if (!passwordRegex.test(password)) {
      return renderResetForm({
        type: "warning",
        title: "Weak Password",
        message: "Password does not meet the required criteria.",
      });
    }

    const user = await User.findOne({
      reset_token: tokenHash,
      reset_expires: { $gt: new Date() },
    });

    if (!user) {
      return res.render("auth-status", {
        type: "error",
        title: "Reset Link Expired",
        message: "This password reset link is no longer valid.",
        buttonText: "Forgot Password",
        buttonLink: "/forgot-password",
      });
    }

    const isSamePassword = await bcrypt.compare(password, user.password);

    if (isSamePassword) {
      return renderResetForm({
        type: "warning",
        title: "Same Password",
        message: "Your new password must be different from your old password.",
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.reset_token = null;
    user.reset_expires = null;
    user.passwordChangedAt = new Date();
    user.sessionVersion = (user.sessionVersion || 0) + 1;

    await user.save();

    return res.render("auth-status", {
      type: "success",
      title: "Password Updated",
      message: "Your password has been updated successfully.",
      buttonText: "Go to Login",
      buttonLink: "/login",
    });
  } catch (error) {
    return next(error);
  }
};

exports.changePasswordPage = (req, res) => {
    res.render("change-password", {
        title: "Change Password"
    });
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, password, confirmPassword } = req.body;

    const renderChangePassword = (toast) =>
      res.render("change-password", { toast });

    if (!currentPassword || !password || !confirmPassword) {
      return renderChangePassword({
        type: "error",
        title: "Missing information",
        message: "Please fill in all password fields.",
      });
    }

    if (password !== confirmPassword) {
      return renderChangePassword({
        type: "error",
        title: "Error",
        message: "Passwords do not match.",
      });
    }

    if (!passwordRegex.test(password)) {
      return renderChangePassword({
        type: "warning",
        title: "Weak Password",
        message: "Password does not meet the required criteria.",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      res.clearCookie("jwt");
      return res.redirect("/login");
    }

    const currentPasswordMatches = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!currentPasswordMatches) {
      return renderChangePassword({
        type: "error",
        title: "Error",
        message: "Current password is incorrect.",
      });
    }

    const newPasswordMatchesOld = await bcrypt.compare(
      password,
      user.password
    );

    if (newPasswordMatchesOld) {
      return renderChangePassword({
        type: "warning",
        title: "Same Password",
        message: "New password must be different from your current password.",
      });
    }

    user.password = await bcrypt.hash(password, 12);
    user.passwordChangedAt = new Date();
    user.sessionVersion = (user.sessionVersion || 0) + 1;

    await user.save();

   
    const sessionDurationMs = parseDurationToMs(
      process.env.JWT_EXPIRES_IN || "1d"
    );

    const newToken = jwt.sign(
      { id: user._id.toString(), sessionVersion: user.sessionVersion },
      process.env.JWT_SECRET,
      { expiresIn: Math.floor(sessionDurationMs / 1000) }
    );

    res.cookie("jwt", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: sessionDurationMs,
    });

    return res.redirect("/dashboard?passwordChanged=true");
  } catch (error) {
    return next(error);
  }
};

exports.dashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("name email is_verified createdAt")
      .lean();

    if (!user) {
      res.clearCookie("jwt");
      return res.redirect("/login");
    }

    user.memberSince = new Date(user.createdAt).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

    let toast = null;

    if (req.query.welcome === "true") {
      toast = {
        type: "success",
        title: "Login Successful",
        message: `Welcome back, ${user.name}!`,
      };
    }

    if (req.query.passwordChanged === "true") {
      toast = {
        type: "success",
        title: "Success",
        message: "Password changed successfully!",
      };
    }

    return res.render("dashboard", {
      user,
      isDashboard: true,
      toast,
    });
  } catch (error) {
    return next(error);
  }
};