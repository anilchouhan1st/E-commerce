// Runs before each test file's own imports (see jest.config.js
// "setupFiles"). dotenv.config() in app.js does NOT override variables
// that are already set on process.env, so setting these here first means
// the test suite never touches real credentials/.env.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-only-jwt-secret-do-not-use-in-production";
process.env.CSRF_SECRET = "test-only-csrf-secret-do-not-use-in-production";
process.env.JWT_EXPIRES_IN = "1d";
process.env.REMEMBER_ME_EXPIRES_IN = "30d";
process.env.EMAIL_FROM = "no-reply@example.com";
process.env.BASE_URL = "http://localhost:5000";
process.env.SMTP_HOST = "smtp.example.com";
process.env.SMTP_PORT = "587";
process.env.EMAIL_USER = "test-smtp-user";
process.env.EMAIL_PASS = "test-smtp-pass";
