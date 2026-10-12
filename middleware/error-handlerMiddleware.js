const { invalidCsrfTokenError } = require("./csrfMiddleware");

const isApiRequest = (req) =>
    req.originalUrl.startsWith("/cart") ||
    req.originalUrl.startsWith("/store") ||
    req.originalUrl.startsWith("/categories") ||
    req.xhr ||
    Boolean(req.headers.accept?.includes("application/json"));

const notFound = (req, res) => {
    if (isApiRequest(req)) {
        return res.status(404).json({
            success: false,
            message: "Route not found",
        });
    }

    res.status(404).render("404", {
        title: "404 - Page Not Found"
    });
};

const errorHandler = (err, req, res, next) => {
    const apiReq = isApiRequest(req);

    if (
        err === invalidCsrfTokenError ||
        err?.code === "EBADCSRFTOKEN"
    ) {
        console.error("Invalid CSRF token:", err);

        if (apiReq) {
            return res.status(403).json({
                success: false,
                message: "Invalid or expired CSRF token",
            });
        }

        return res.status(403).render("auth-status", {
            type: "error",
            title: "Form Expired",
            message: "This form has expired or is invalid. Please try again.",
            buttonText: "Go Back",
            buttonLink: "/login",
        });
    }

    console.error(err);

    if (apiReq) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }

    res.status(500).render("500", {
        title: "500 - Internal Server Error"
    });
};

module.exports = {
    notFound,
    errorHandler
};