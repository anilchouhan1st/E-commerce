const helmet = require("helmet");
const crypto = require("crypto");

const securityMiddleware = [
    (req, res, next) => {
        res.locals.nonce = crypto.randomBytes(16).toString("hex");
        next();
    },

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
                    "https://cdnjs.cloudflare.com",
                ],

                scriptSrc: [
                    "'self'",
                    (req, res) => `'nonce-${res.locals.nonce}'`,
                ],

                imgSrc: ["'self'", "data:"],
            },
        },
    }),
];

module.exports = securityMiddleware;