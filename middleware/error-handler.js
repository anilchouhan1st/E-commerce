const { invalidCsrfTokenError } = require("./csrf");

const notFound = (req, res) => {
    res.status(404).render("404", {
        title: "404 - Page Not Found"
    });
};

const errorHandler = (err, req, res, next) => {

    if (
        err === invalidCsrfTokenError ||
        err?.code === "EBADCSRFTOKEN"
    ) {
        console.error("Invalid CSRF token:", err);

        return res.status(403).render("auth-status", {
            type: "error",
            title: "Form Expired",
            message: "This form has expired or is invalid. Please try again.",
            buttonText: "Go Back",
            buttonLink: "/login",
        });
    }

    console.error(err);

    res.status(500).render("500", {
        title: "500 - Internal Server Error"
    });
};

module.exports = {
    notFound,
    errorHandler
};