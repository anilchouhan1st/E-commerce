const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


jest.mock("../config/mail", () => ({
  sendMail: jest.fn().mockResolvedValue(true),
}));

const testDb = require("./testDb");

let app;
let User;
let transporter;

beforeAll(async () => {
  await testDb.connect();

  app = require("../app");
  User = require("../models/User");
  transporter = require("../config/mail");
});

afterAll(async () => {
  await testDb.disconnect();
});

afterEach(async () => {
  await testDb.clearDatabase();
  transporter.sendMail.mockClear();
});

// ---- helpers -------------------------------------------------------------

const VALID_PASSWORD = "Password1!";

function extractCsrfToken(res) {
  const match = res.text.match(/name="_csrf" value="([^"]*)"/);
  return match ? match[1] : null;
}

function extractSetCookie(res, name) {
  const cookies = res.headers["set-cookie"] || [];
  return cookies.find((c) => c.startsWith(`${name}=`)) || null;
}

async function createVerifiedUser(overrides = {}) {
  const plainPassword = overrides.password || VALID_PASSWORD;
  const hashed = await bcrypt.hash(plainPassword, 12);

  const user = await User.create({
    name: overrides.name || "Test User",
    email: overrides.email || "verified@example.com",
    is_verified: true,
    ...overrides,
    password: hashed,
  });

  return { user, plainPassword };
}

async function loginAgent(agent, email, password, rememberMe) {
  const getRes = await agent.get("/login");
  const csrfToken = extractCsrfToken(getRes);

  const body = { email, password, _csrf: csrfToken };
  if (rememberMe) body.rememberMe = "on";

  return agent.post("/auth/login").type("form").send(body);
}

// ---- registration ---------------------------------------------------------

describe("Registration", () => {
  test("creates an unverified user with a hashed password and sends a verification email", async () => {
    const agent = request.agent(app);
    const getRes = await agent.get("/register");
    const csrfToken = extractCsrfToken(getRes);

    const res = await agent.post("/auth/register").type("form").send({
      name: "New User",
      email: "newuser@example.com",
      password: VALID_PASSWORD,
      Confirm_password: VALID_PASSWORD,
      _csrf: csrfToken,
    });

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/check your email/i);

    const savedUser = await User.findOne({ email: "newuser@example.com" });
    expect(savedUser).toBeTruthy();
    expect(savedUser.is_verified).toBe(false);
    expect(savedUser.password).not.toBe(VALID_PASSWORD);
    expect(await bcrypt.compare(VALID_PASSWORD, savedUser.password)).toBe(true);

    expect(transporter.sendMail).toHaveBeenCalledTimes(1);
    expect(transporter.sendMail.mock.calls[0][0].to).toBe("newuser@example.com");
  });

  test("rejects a duplicate email without creating a second account", async () => {
    await createVerifiedUser({ email: "dupe@example.com" });

    const agent = request.agent(app);
    const getRes = await agent.get("/register");
    const csrfToken = extractCsrfToken(getRes);

    const res = await agent.post("/auth/register").type("form").send({
      name: "Second User",
      email: "dupe@example.com",
      password: VALID_PASSWORD,
      Confirm_password: VALID_PASSWORD,
      _csrf: csrfToken,
    });

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/already exists/i);

    const count = await User.countDocuments({ email: "dupe@example.com" });
    expect(count).toBe(1);
  });

  test("rejects a weak password before creating any account", async () => {
    const agent = request.agent(app);
    const getRes = await agent.get("/register");
    const csrfToken = extractCsrfToken(getRes);

    const res = await agent.post("/auth/register").type("form").send({
      name: "Weak Pw",
      email: "weakpw@example.com",
      password: "weak",
      Confirm_password: "weak",
      _csrf: csrfToken,
    });

    expect(res.status).toBe(422);
    const savedUser = await User.findOne({ email: "weakpw@example.com" });
    expect(savedUser).toBeNull();
  });

  test("does not fail the request when sending the verification email fails", async () => {
    transporter.sendMail.mockRejectedValueOnce(new Error("SMTP down"));

    const agent = request.agent(app);
    const getRes = await agent.get("/register");
    const csrfToken = extractCsrfToken(getRes);

    const res = await agent.post("/auth/register").type("form").send({
      name: "Mail Fail",
      email: "mailfail@example.com",
      password: VALID_PASSWORD,
      Confirm_password: VALID_PASSWORD,
      _csrf: csrfToken,
    });

    // Account must still exist, and the user must see the normal success
    // message rather than a 500/confusing failure page.
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/check your email/i);
    const savedUser = await User.findOne({ email: "mailfail@example.com" });
    expect(savedUser).toBeTruthy();
  });
});

// ---- email verification ----------------------------------------------------

describe("Email verification", () => {
  test("verifies the account when the emailed token is used", async () => {
    const agent = request.agent(app);
    const getRes = await agent.get("/register");
    const csrfToken = extractCsrfToken(getRes);

    await agent.post("/auth/register").type("form").send({
      name: "Verify Me",
      email: "verifyme@example.com",
      password: VALID_PASSWORD,
      Confirm_password: VALID_PASSWORD,
      _csrf: csrfToken,
    });

    const mailHtml = transporter.sendMail.mock.calls[0][0].html;
    const linkMatch = mailHtml.match(/\/auth\/verify\/([a-f0-9]{64})/);
    expect(linkMatch).toBeTruthy();

    const verifyRes = await request(app).get(`/auth/verify/${linkMatch[1]}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.text).toMatch(/verified successfully/i);

    const user = await User.findOne({ email: "verifyme@example.com" });
    expect(user.is_verified).toBe(true);
  });

  test("rejects a garbage/invalid verification token", async () => {
    const res = await request(app).get("/auth/verify/not-a-real-token");
    expect(res.status).toBe(400);
    expect(res.text).toMatch(/invalid or has expired/i);
  });
});

// ---- login ------------------------------------------------------------------

describe("Login", () => {
  test("logs a verified user in and sets an httpOnly jwt cookie", async () => {
    const { plainPassword } = await createVerifiedUser({
      email: "login-success@example.com",
    });

    const agent = request.agent(app);
    const res = await loginAgent(agent, "login-success@example.com", plainPassword);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/dashboard?welcome=true");

    const jwtCookie = extractSetCookie(res, "jwt");
    expect(jwtCookie).toBeTruthy();
    expect(jwtCookie).toMatch(/HttpOnly/i);
  });

  test("rejects an incorrect password without revealing whether the account exists", async () => {
    await createVerifiedUser({ email: "wrongpass@example.com" });

    const agent = request.agent(app);
    const res = await loginAgent(agent, "wrongpass@example.com", "WrongPassword1!");

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/invalid email or password/i);
  });

  test("rejects login for an email that was never registered, with the same message as a wrong password", async () => {
    const agent = request.agent(app);
    const res = await loginAgent(agent, "doesnotexist@example.com", "Whatever1!");

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/invalid email or password/i);
  });

  test("blocks login for an unverified account", async () => {
    const hashed = await bcrypt.hash(VALID_PASSWORD, 12);
    await User.create({
      name: "Unverified",
      email: "unverified@example.com",
      password: hashed,
      is_verified: false,
    });

    const agent = request.agent(app);
    const res = await loginAgent(agent, "unverified@example.com", VALID_PASSWORD);

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/verify your email/i);
  });
});

// ---- protected routes ---------------------------------------------------

describe("Protected routes", () => {
  test("redirects to /login when there is no session cookie", async () => {
    const res = await request(app).get("/dashboard");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });

  test("serves the dashboard for a logged-in user", async () => {
    const { plainPassword, user } = await createVerifiedUser({
      email: "dashboard@example.com",
      name: "Dashboard User",
    });

    const agent = request.agent(app);
    await loginAgent(agent, "dashboard@example.com", plainPassword);

    const res = await agent.get("/dashboard");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Dashboard User");
  });

  test("redirects to /login for a garbage/tampered jwt cookie", async () => {
    const res = await request(app)
      .get("/dashboard")
      .set("Cookie", "jwt=this-is-not-a-real-jwt");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });
});

// ---- logout ---------------------------------------------------------------

describe("Logout", () => {
  test("the old GET /logout route no longer works", async () => {
    const res = await request(app).get("/logout");
    expect(res.status).toBe(404);
  });

  test("POST /logout requires a valid CSRF token and a valid session, then clears the cookie", async () => {
    const { plainPassword } = await createVerifiedUser({
      email: "logout@example.com",
    });

    const agent = request.agent(app);
    await loginAgent(agent, "logout@example.com", plainPassword);

    const dashboardRes = await agent.get("/dashboard");
    const csrfToken = extractCsrfToken(dashboardRes);

    const logoutRes = await agent
      .post("/logout")
      .type("form")
      .send({ _csrf: csrfToken });

    expect(logoutRes.status).toBe(302);
    expect(logoutRes.headers.location).toBe("/login?toast=logout");

    const clearedCookie = extractSetCookie(logoutRes, "jwt");
    expect(clearedCookie).toMatch(/jwt=;/);

    // The agent's cookie jar now holds the cleared cookie: dashboard should
    // bounce back to /login.
    const afterLogout = await agent.get("/dashboard");
    expect(afterLogout.status).toBe(302);
    expect(afterLogout.headers.location).toBe("/login");
  });

  test("POST /logout is rejected without authentication", async () => {
    const res = await request(app).post("/logout").type("form").send({});
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });
});

// ---- forgot password / reset password -----------------------------------

describe("Password reset", () => {
  test("full flow: request reset, use the emailed token, log in with the new password, and the old session is invalidated", async () => {
    const { user, plainPassword } = await createVerifiedUser({
      email: "reset-flow@example.com",
    });

    // Log in first so we have an "old" session to prove gets invalidated.
    const oldAgent = request.agent(app);
    const oldLoginRes = await loginAgent(oldAgent, "reset-flow@example.com", plainPassword);
    const oldJwtCookie = extractSetCookie(oldLoginRes, "jwt");

    // Request the reset email.
    const forgotAgent = request.agent(app);
    const forgotGetRes = await forgotAgent.get("/forgot-password");
    const forgotCsrf = extractCsrfToken(forgotGetRes);

    const forgotRes = await forgotAgent
      .post("/auth/forgot-password")
      .type("form")
      .send({ email: "reset-flow@example.com", _csrf: forgotCsrf });

    expect(forgotRes.status).toBe(200);
    expect(transporter.sendMail).toHaveBeenCalledTimes(1);

    const mailHtml = transporter.sendMail.mock.calls[0][0].html;
    const linkMatch = mailHtml.match(/\/auth\/reset-password\/([a-f0-9]{64})/);
    expect(linkMatch).toBeTruthy();
    const resetToken = linkMatch[1];

    // Load the reset form and submit a new password.
    const resetAgent = request.agent(app);
    const resetGetRes = await resetAgent.get(`/auth/reset-password/${resetToken}`);
    expect(resetGetRes.status).toBe(200);
    const resetCsrf = extractCsrfToken(resetGetRes);

    const NEW_PASSWORD = "NewPassword2@";
    const resetPostRes = await resetAgent
      .post(`/auth/reset-password/${resetToken}`)
      .type("form")
      .send({
        password: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
        _csrf: resetCsrf,
      });

    expect(resetPostRes.status).toBe(200);
    expect(resetPostRes.text).toMatch(/updated successfully/i);

    // The reset token cannot be reused.
    const reuseRes = await request(app).get(`/auth/reset-password/${resetToken}`);
    expect(reuseRes.text).toMatch(/no longer valid/i);

    // The password actually changed in the database.
    const updatedUser = await User.findById(user._id);
    expect(await bcrypt.compare(NEW_PASSWORD, updatedUser.password)).toBe(true);
    expect(await bcrypt.compare(plainPassword, updatedUser.password)).toBe(false);

    // The pre-reset JWT is now rejected.
    const staleRes = await request(app).get("/dashboard").set("Cookie", oldJwtCookie);
    expect(staleRes.status).toBe(302);
    expect(staleRes.headers.location).toBe("/login");

    // Logging in again with the new password works.
    const newAgent = request.agent(app);
    const newLoginRes = await loginAgent(newAgent, "reset-flow@example.com", NEW_PASSWORD);
    expect(newLoginRes.status).toBe(302);
    expect(newLoginRes.headers.location).toBe("/dashboard?welcome=true");
  });

  test("forgot-password shows the same generic message even when the email fails to send", async () => {
    await createVerifiedUser({ email: "mailfail-forgot@example.com" });
    transporter.sendMail.mockRejectedValueOnce(new Error("SMTP down"));

    const agent = request.agent(app);
    const getRes = await agent.get("/forgot-password");
    const csrfToken = extractCsrfToken(getRes);

    const res = await agent
      .post("/auth/forgot-password")
      .type("form")
      .send({ email: "mailfail-forgot@example.com", _csrf: csrfToken });

    expect(res.status).toBe(200);
    // Same generic response as the happy path - does not leak the mail error.
    expect(res.text).not.toMatch(/smtp|error sending/i);
  });

  test("forgot-password gives the same generic response for a non-existent email (no account enumeration)", async () => {
    const agent = request.agent(app);
    const getRes = await agent.get("/forgot-password");
    const csrfToken = extractCsrfToken(getRes);

    const res = await agent
      .post("/auth/forgot-password")
      .type("form")
      .send({ email: "no-such-account@example.com", _csrf: csrfToken });

    expect(res.status).toBe(200);
    expect(transporter.sendMail).not.toHaveBeenCalled();
  });
});

// ---- change password (logged in) -----------------------------------------

describe("Change password", () => {
  test("changes the password, keeps the current session working, and invalidates other sessions", async () => {
    const { user, plainPassword } = await createVerifiedUser({
      email: "changepw@example.com",
    });

    // A second, separate "other device" session for the same user.
    const otherDeviceAgent = request.agent(app);
    const otherLoginRes = await loginAgent(otherDeviceAgent, "changepw@example.com", plainPassword);
    const otherDeviceCookie = extractSetCookie(otherLoginRes, "jwt");

    // The primary session that will perform the change.
    const agent = request.agent(app);
    await loginAgent(agent, "changepw@example.com", plainPassword);

    const pageRes = await agent.get("/auth/change-password");
    expect(pageRes.status).toBe(200);
    const csrfToken = extractCsrfToken(pageRes);

    const NEW_PASSWORD = "AnotherPass3#";
    const changeRes = await agent
      .post("/auth/change-password")
      .type("form")
      .send({
        currentPassword: plainPassword,
        password: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
        _csrf: csrfToken,
      });

    expect(changeRes.status).toBe(302);
    expect(changeRes.headers.location).toBe("/dashboard?passwordChanged=true");

    // The current session keeps working (a fresh cookie was issued).
    const stillWorks = await agent.get("/dashboard");
    expect(stillWorks.status).toBe(200);

    // The other device's old token is now rejected.
    const otherDeviceStale = await request(app)
      .get("/dashboard")
      .set("Cookie", otherDeviceCookie);
    expect(otherDeviceStale.status).toBe(302);
    expect(otherDeviceStale.headers.location).toBe("/login");

    // Password actually changed in the database.
    const updatedUser = await User.findById(user._id);
    expect(await bcrypt.compare(NEW_PASSWORD, updatedUser.password)).toBe(true);
  });

  test("rejects an incorrect current password without changing anything", async () => {
    const { user, plainPassword } = await createVerifiedUser({
      email: "changepw-wrong@example.com",
    });

    const agent = request.agent(app);
    await loginAgent(agent, "changepw-wrong@example.com", plainPassword);

    const pageRes = await agent.get("/auth/change-password");
    const csrfToken = extractCsrfToken(pageRes);

    const res = await agent
      .post("/auth/change-password")
      .type("form")
      .send({
        currentPassword: "TotallyWrong1!",
        password: "SomethingNew1!",
        confirmPassword: "SomethingNew1!",
        _csrf: csrfToken,
      });

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/current password is incorrect/i);

    const unchangedUser = await User.findById(user._id);
    expect(await bcrypt.compare(plainPassword, unchangedUser.password)).toBe(true);
  });

  test("requires authentication", async () => {
    const res = await request(app).get("/auth/change-password");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/login");
  });
});

// ---- CSRF protection --------------------------------------------------------

describe("CSRF protection", () => {
  test("rejects a state-changing POST with no CSRF token/cookie at all", async () => {
    const res = await request(app)
      .post("/auth/login")
      .type("form")
      .send({ email: "someone@example.com", password: "whatever" });

    expect(res.status).toBe(403);
  });

  test("rejects a POST whose CSRF token does not match its cookie", async () => {
    const agent = request.agent(app);
    await agent.get("/login"); // sets a real CSRF cookie on the agent

    const res = await agent
      .post("/auth/login")
      .type("form")
      .send({
        email: "someone@example.com",
        password: "whatever",
        _csrf: "this-does-not-match-the-cookie",
      });

    expect(res.status).toBe(403);
  });

  test("accepts a POST whose CSRF token matches its cookie", async () => {
    await createVerifiedUser({ email: "csrf-ok@example.com" });

    const agent = request.agent(app);
    const res = await loginAgent(agent, "csrf-ok@example.com", VALID_PASSWORD);

    // A valid CSRF pairing gets past the CSRF check either way; 403 would
    // only happen from a CSRF failure specifically.
    expect(res.status).not.toBe(403);
  });
});

// ---- remember me ------------------------------------------------------------

describe("Remember me", () => {
  test("without Remember me, the JWT and cookie both expire after the default session length", async () => {
    const { plainPassword } = await createVerifiedUser({
      email: "no-remember@example.com",
    });

    const agent = request.agent(app);
    const res = await loginAgent(agent, "no-remember@example.com", plainPassword, false);

    const jwtSetCookie = extractSetCookie(res, "jwt");
    const maxAgeMatch = jwtSetCookie.match(/Max-Age=(\d+)/i);
    expect(maxAgeMatch).toBeTruthy();
    const cookieMaxAgeSeconds = Number(maxAgeMatch[1]);

    // process.env.JWT_EXPIRES_IN is "1d" in the test environment.
    expect(cookieMaxAgeSeconds).toBe(24 * 60 * 60);

    const jwtValue = jwtSetCookie.split(";")[0].split("=")[1];
    const decoded = jwt.decode(jwtValue);
    expect(decoded.exp - decoded.iat).toBe(cookieMaxAgeSeconds);
  });

  test("with Remember me checked, the JWT and cookie both get the longer lifetime, in sync", async () => {
    const { plainPassword } = await createVerifiedUser({
      email: "remember@example.com",
    });

    const agent = request.agent(app);
    const res = await loginAgent(agent, "remember@example.com", plainPassword, true);

    const jwtSetCookie = extractSetCookie(res, "jwt");
    const maxAgeMatch = jwtSetCookie.match(/Max-Age=(\d+)/i);
    const cookieMaxAgeSeconds = Number(maxAgeMatch[1]);

    // process.env.REMEMBER_ME_EXPIRES_IN is "30d" in the test environment.
    expect(cookieMaxAgeSeconds).toBe(30 * 24 * 60 * 60);

    const jwtValue = jwtSetCookie.split(";")[0].split("=")[1];
    const decoded = jwt.decode(jwtValue);
    expect(decoded.exp - decoded.iat).toBe(cookieMaxAgeSeconds);
  });
});
