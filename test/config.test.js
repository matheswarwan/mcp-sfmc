const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const config = require("../dist/config.js");

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "mcp-sfmc-test-"));
}

function withEnv(vars, fn) {
  const saved = {};
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const CLEAN_ENV = {
  SFMC_CONFIG_PATH: undefined,
  XDG_CONFIG_HOME: undefined,
  SFMC_SUBDOMAIN: undefined,
  SFMC_CLIENT_ID: undefined,
  SFMC_CLIENT_SECRET: undefined,
  SFMC_ACCOUNT_ID: undefined,
  SFMC_BUSINESS_UNIT_NAME: undefined,
};

const account = (overrides = {}) => ({
  business_unit_name: "Primary",
  subdomain: "abc123",
  grant_type: "client_credentials",
  client_id: "id-1",
  client_secret: "secret-1",
  ...overrides,
});

test.beforeEach(() => config.clearAccountsCache());

test("resolveConfigPath prefers SFMC_CONFIG_PATH", () => {
  withEnv({ ...CLEAN_ENV, SFMC_CONFIG_PATH: "/tmp/explicit.json" }, () => {
    assert.equal(config.resolveConfigPath(), "/tmp/explicit.json");
  });
});

test("resolveConfigPath falls back to XDG_CONFIG_HOME", () => {
  withEnv({ ...CLEAN_ENV, XDG_CONFIG_HOME: "/tmp/xdg" }, () => {
    assert.equal(config.resolveConfigPath(), path.join("/tmp/xdg", "sfmc", "accounts.json"));
  });
});

test("resolveConfigPath falls back to ~/.config", () => {
  withEnv(CLEAN_ENV, () => {
    assert.equal(
      config.resolveConfigPath(),
      path.join(os.homedir(), ".config", "sfmc", "accounts.json")
    );
  });
});

test("writeAccountsFile creates the file 0600 and round-trips", () => {
  const dir = tmpDir();
  const file = path.join(dir, "nested", "accounts.json");

  config.writeAccountsFile([account()], file);

  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.equal(config.isPermissive(file), false);
  assert.deepEqual(config.readAccountsFile(file), [account()]);
});

test("readAccountsFile returns [] for a missing file", () => {
  assert.deepEqual(config.readAccountsFile(path.join(tmpDir(), "nope.json")), []);
});

test("readAccountsFile rejects invalid JSON and non-arrays", () => {
  const dir = tmpDir();

  const bad = path.join(dir, "bad.json");
  fs.writeFileSync(bad, "{not json");
  assert.throws(() => config.readAccountsFile(bad), /not valid JSON/);

  const obj = path.join(dir, "obj.json");
  fs.writeFileSync(obj, '{"business_unit_name":"X"}');
  assert.throws(() => config.readAccountsFile(obj), /must contain an array/);
});

test("loadAccounts maps snake_case to camelCase", () => {
  const file = path.join(tmpDir(), "accounts.json");
  config.writeAccountsFile([account({ account_id: "7654321" })], file);

  withEnv({ ...CLEAN_ENV, SFMC_CONFIG_PATH: file }, () => {
    config.clearAccountsCache();
    assert.deepEqual(config.loadAccounts(), [
      {
        businessUnitName: "Primary",
        subdomain: "abc123",
        clientId: "id-1",
        clientSecret: "secret-1",
        accountId: "7654321",
      },
    ]);
  });
});

test("loadAccounts rejects an entry missing required fields", () => {
  const file = path.join(tmpDir(), "accounts.json");
  fs.writeFileSync(file, JSON.stringify([{ business_unit_name: "Broken", subdomain: "abc" }]));

  withEnv({ ...CLEAN_ENV, SFMC_CONFIG_PATH: file }, () => {
    config.clearAccountsCache();
    assert.throws(() => config.loadAccounts(), /missing required fields/);
  });
});

test("loadAccounts explains itself when no config exists", () => {
  withEnv({ ...CLEAN_ENV, SFMC_CONFIG_PATH: path.join(tmpDir(), "absent.json") }, () => {
    config.clearAccountsCache();
    assert.throws(() => config.loadAccounts(), /mcp-sfmc init/);
  });
});

test("loadAccounts picks up an edit to the file without a restart", () => {
  const file = path.join(tmpDir(), "accounts.json");
  config.writeAccountsFile([account()], file);

  withEnv({ ...CLEAN_ENV, SFMC_CONFIG_PATH: file }, () => {
    config.clearAccountsCache();
    assert.equal(config.loadAccounts().length, 1);

    // Simulate `mcp-sfmc add` running while the server is live.
    const later = new Date(Date.now() + 2000);
    config.writeAccountsFile([account(), account({ business_unit_name: "Sales" })], file);
    fs.utimesSync(file, later, later);

    const reloaded = config.loadAccounts();
    assert.equal(reloaded.length, 2);
    assert.equal(reloaded[1].businessUnitName, "Sales");
  });
});

test("getAccount defaults to the first entry and matches case-insensitively", () => {
  const file = path.join(tmpDir(), "accounts.json");
  config.writeAccountsFile([account(), account({ business_unit_name: "Sales" })], file);

  withEnv({ ...CLEAN_ENV, SFMC_CONFIG_PATH: file }, () => {
    config.clearAccountsCache();
    assert.equal(config.getAccount().businessUnitName, "Primary");
    assert.equal(config.getAccount("sales").businessUnitName, "Sales");
    assert.throws(() => config.getAccount("Nope"), /not found.*"Primary", "Sales"/s);
  });
});

test("environment variables alone define a single business unit", () => {
  withEnv(
    {
      ...CLEAN_ENV,
      SFMC_CONFIG_PATH: "/nonexistent/should-not-be-read.json",
      SFMC_SUBDOMAIN: "env-sub",
      SFMC_CLIENT_ID: "env-id",
      SFMC_CLIENT_SECRET: "env-secret",
      SFMC_ACCOUNT_ID: "999",
      SFMC_BUSINESS_UNIT_NAME: "From Env",
    },
    () => {
      config.clearAccountsCache();
      const [only] = config.loadAccounts();
      assert.equal(only.businessUnitName, "From Env");
      assert.equal(only.subdomain, "env-sub");
      assert.equal(only.accountId, "999");
    }
  );
});
