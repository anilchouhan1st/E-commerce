const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cookieParser = require("cookie-parser");
const hbs = require("hbs");
const helmet = require("helmet");
const crypto = require("crypto");

// Load environment variables
dotenv.config({ path: './.env' });

const app = express();

//Database connection

const { connectToDatabase } = require("./database/db");

//Middleware
const { generateCsrfToken, invalidCsrfTokenError } = require("./middleware/csrf");
const { attachUser } = require("./middleware/auth-middleware");
const securityMiddleware = require("./middleware/security");
const {notFound,errorHandler} = require("./middleware/error-handler");
const { attachCsrfToken } = require("./middleware/csrf");

//Routes
const productRouter = require('./routes/product-routes');
const pageRouter = require("./routes/page-routes");
const authRouter = require("./routes/auth-routes");
const categoryRouter = require('./routes/category-routes');
const cartRouter = require('./routes/cart-routes');

// Basic configuration
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.set('view engine', 'hbs');
app.disable('view cache');
app.set('view cache', false);
app.set("views", path.join(__dirname, "views"));

// Parsers / cookies

app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// Security

app.use(securityMiddleware);

// Authentication / CSRF

app.use(attachCsrfToken);
app.use(attachUser);

// Static files

const publicDirectory = path.join(__dirname, "./public");
app.use(express.static(publicDirectory));

// HBS

hbs.registerPartials(
    path.join(__dirname, "views", "partials")
);

hbs.registerHelper("eq", function (a, b) {
    return a === b;
});

// Routes
app.use('/store', productRouter);
app.use('/', pageRouter);
app.use('/auth', authRouter);
app.use('/categories', categoryRouter);
app.use('/cart', cartRouter);

// Error handling

app.use(notFound);
app.use(errorHandler);

// Export
module.exports = app;
