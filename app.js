const express = require("express");
const dotenv = require("dotenv");


dotenv.config({ path: './.env' });
const helmet = require("helmet");
const crypto = require("crypto");

const path = require("path");
const cookieParser = require("cookie-parser");
const hbs = require("hbs");

const app = express();
const { connectToDatabase } = require("./database/db");
const authController = require("./controllers/auth");
const { generateCsrfToken, invalidCsrfTokenError } = require("./middleware/csrf");

const productRouter=require('./routes/product-routes');

app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);


app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString("hex");
    next();
});

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: [
                    "'self'",
                    "https://cdn.jsdelivr.net",
                    "https://cdnjs.cloudflare.com",
                    "https://public.codepenassets.com",
                    "https://fonts.googleapis.com",
                ],
                fontSrc: [
                    "'self'",
                    "https://fonts.gstatic.com",
                    "https://cdnjs.cloudflare.com",
                    "https://assets.codepen.io",
                ],
                scriptSrc: [
                    "'self'",
                    (req, res) => `'nonce-${res.locals.nonce}'`,
                ],
                imgSrc: ["'self'", "data:"],
            },
        },
    })
);

app.use(cookieParser());
app.use(authController.attachUser);

app.use((req, res, next) => {
    res.locals.csrfToken = generateCsrfToken(req, res);
    next();
});

hbs.registerPartials(
    path.join(__dirname, "views", "partials")
);

const publicDirectory = path.join(__dirname, "./public");
app.use(express.static(publicDirectory));

app.use(express.urlencoded({ extended: false }));

app.use(express.json());

app.set('view engine', 'hbs');
app.disable('view cache');
app.set('view cache', false);

app.set("views", path.join(__dirname, "views"));

//routes
app.use('/store',productRouter);
app.use('/', require("./routes/page"));
app.use('/auth', require('./routes/auth'));


hbs.registerHelper("eq", function (a, b) {
    return a === b;
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    await connectToDatabase();

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

if (require.main === module) {
    startServer().catch((error) => {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    });
}

app.use((req, res) => {
    res.status(404).render("404", {
        title: "404 - Page Not Found"
    });
});

app.use((err, req, res, next) => {

    if (err === invalidCsrfTokenError || err?.code === "EBADCSRFTOKEN") {
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

});

module.exports = app;

