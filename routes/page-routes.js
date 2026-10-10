const express = require("express");
const authController = require("../controllers/auth-controller");
const { doubleCsrfProtection } = require("../middleware/csrf");
const router = express.Router();
const {protect}=require('../middleware/auth-middleware');

router.get("/", (req, res) => {
    res.redirect("/login");
});

router.get("/login", (req, res) => {
    res.render("login", {
        isLogin: true
    });
});

router.get("/register", (req, res) => {
    res.render("register", {
        isRegister: true
    });
});

router.get("/forgot-password", (req, res) => {
    res.render("forgot-password");
});

router.get(
  "/dashboard",
  protect,
  authController.dashboard
);

router.post(
    "/logout",
    protect,
    doubleCsrfProtection,
    (req, res) => {
        res.clearCookie("jwt");

        res.redirect(
            "/login?toast=logout"
        );
    }
);

module.exports = router;
