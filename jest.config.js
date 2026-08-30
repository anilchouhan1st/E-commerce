module.exports = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/testEnv.js"],
  testTimeout: 30000,
  // Each test file gets its own in-memory MongoDB instance (see
  // tests/testDb.js), so files are safe to run one at a time. --runInBand
  // (set in package.json's "test" script) keeps them from fighting over
  // memory/CPU when several MongoMemoryServer instances start at once.
};
