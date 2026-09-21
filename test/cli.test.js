const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const BIN = path.join(__dirname, "..", "dist", "index.js");

function run(args, { env = {}, input = "" } = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    input,
    encoding: "utf-8",
    env: {
      ...process.env,
      // Keep each case isolated from the developer's real configuration.
      XDG_CONFIG_HOME: undefined,
      SFMC_SUBDOMAIN: undefined,
      SFMC_CLIENT_ID: undefined,
      SFMC_CLIENT_SECRET: undefined,
      SFMC_ACCOUNT_ID: undefined,
      SFMC_BUSINESS_UNIT_NAME: undefined,
      ...env,
    },
  });
}

function freshConfigPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mcp-sfmc-cli-")), "accounts.json");
}

const addArgs = (name, extra = []) => [
  "add",
  "--no-verify",
  "--name",
  name,
  "--subdomain",
  "sub-1234",
  "--client-id",
  "cid",
  "--client-secret",
  "csecret",
  ...extra,
];

test("help is shown for `help` and exits 0", () => {
  const result = run(["help"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /mcp-sfmc init/);
  assert.match(result.stdout, /XDG_CONFIG_HOME/);
});

test("--version prints the package version", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf-8"));
  const result = run(["--version"]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), pkg.version);
});

test("an unknown command fails with guidance", () => {
  const result = run(["frobnicate"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown command "frobnicate"/);
});

test("add writes a 0600 config and list redacts the secret", () => {
  const configPath = freshConfigPath();

  const added = run(addArgs("Primary", ["--account-id", "12345"]), {
    env: { SFMC_CONFIG_PATH: configPath },
  });
  assert.equal(added.status, 0, added.stderr);
  assert.match(added.stdout, /Added "Primary"/);

  assert.equal(fs.statSync(configPath).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(fs.readFileSync(configPath, "utf-8")), [
    {
      business_unit_name: "Primary",
      subdomain: "sub-1234",
      grant_type: "client_credentials",
      client_id: "cid",
      client_secret: "csecret",
      account_id: "12345",
    },
  ]);

  const listed = run(["list"], { env: { SFMC_CONFIG_PATH: configPath } });
  assert.equal(listed.status, 0);
  assert.match(listed.stdout, /Primary/);
  assert.match(listed.stdout, /\*{8}cret/);
  assert.doesNotMatch(listed.stdout, /csecret/);
});

test("the secret can be passed through the environment instead of a flag", () => {
  const configPath = freshConfigPath();

  const result = run(
    ["add", "--no-verify", "--name", "EnvSecret", "--subdomain", "sub", "--client-id", "cid"],
    { env: { SFMC_CONFIG_PATH: configPath, SFMC_CLIENT_SECRET: "from-env" } }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(configPath, "utf-8"))[0].client_secret, "from-env");
});

test("a full URL is accepted where a subdomain is expected", () => {
  const configPath = freshConfigPath();

  run(
    [
      "add",
      "--no-verify",
      "--name",
      "URL",
      "--subdomain",
      "https://mc123abc.auth.marketingcloudapis.com/",
      "--client-id",
      "cid",
      "--client-secret",
      "sec",
    ],
    { env: { SFMC_CONFIG_PATH: configPath } }
  );

  assert.equal(JSON.parse(fs.readFileSync(configPath, "utf-8"))[0].subdomain, "mc123abc");
});

test("duplicate business unit names are refused", () => {
  const configPath = freshConfigPath();
  run(addArgs("Primary"), { env: { SFMC_CONFIG_PATH: configPath } });

  const dupe = run(addArgs("primary"), { env: { SFMC_CONFIG_PATH: configPath } });
  assert.equal(dupe.status, 1);
  assert.match(dupe.stderr, /already exists/);
  assert.equal(JSON.parse(fs.readFileSync(configPath, "utf-8")).length, 1);
});

test("missing values are reported when not running interactively", () => {
  const result = run(["add", "--no-verify", "--name", "Incomplete"], {
    env: { SFMC_CONFIG_PATH: freshConfigPath() },
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--subdomain/);
  assert.match(result.stderr, /--client-id/);
  assert.match(result.stderr, /--client-secret/);
});

test("remove deletes the named unit and reports unknown names", () => {
  const configPath = freshConfigPath();
  run(addArgs("Primary"), { env: { SFMC_CONFIG_PATH: configPath } });
  run(addArgs("Sales"), { env: { SFMC_CONFIG_PATH: configPath } });

  const removed = run(["remove", "primary"], { env: { SFMC_CONFIG_PATH: configPath } });
  assert.equal(removed.status, 0, removed.stderr);

  const remaining = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  assert.deepEqual(
    remaining.map((a) => a.business_unit_name),
    ["Sales"]
  );

  const missing = run(["remove", "Nope"], { env: { SFMC_CONFIG_PATH: configPath } });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /not found/);
});

test("path prints the resolved location and signals whether it exists", () => {
  const configPath = freshConfigPath();

  const before = run(["path"], { env: { SFMC_CONFIG_PATH: configPath } });
  assert.equal(before.stdout.trim(), configPath);
  assert.equal(before.status, 1);

  run(addArgs("Primary"), { env: { SFMC_CONFIG_PATH: configPath } });

  const after = run(["path"], { env: { SFMC_CONFIG_PATH: configPath } });
  assert.equal(after.status, 0);
});

test("list on an empty config points at init", () => {
  const result = run(["list"], { env: { SFMC_CONFIG_PATH: freshConfigPath() } });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /mcp-sfmc init/);
});

test("the server refuses to start without configuration and says where to look", () => {
  const configPath = freshConfigPath();
  const result = run([], { env: { SFMC_CONFIG_PATH: configPath }, input: "" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, new RegExp(configPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(result.stderr, /mcp-sfmc init/);
});

test("the server still starts and answers MCP with a valid config", () => {
  const configPath = freshConfigPath();
  run(addArgs("Primary"), { env: { SFMC_CONFIG_PATH: configPath } });

  const initialize = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    },
  });

  const result = run([], { env: { SFMC_CONFIG_PATH: configPath }, input: `${initialize}\n` });

  assert.match(result.stderr, /loaded 1 business unit\(s\): Primary/);

  const response = JSON.parse(result.stdout.trim().split("\n")[0]);
  assert.equal(response.result.serverInfo.name, "mcp-sfmc");

  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf-8"));
  assert.equal(response.result.serverInfo.version, pkg.version);
});

// The secret prompt disables terminal echo, which only means anything on a real
// tty. Driven with expect where available, skipped elsewhere so CI stays portable.
const hasExpect = spawnSync("which", ["expect"], { encoding: "utf-8" }).status === 0;

test("interactive add hides the secret and stores it intact", { skip: !hasExpect }, () => {
  const configPath = freshConfigPath();
  const script = path.join(path.dirname(configPath), "drive.exp");
  const secret = "super-secret-value";

  fs.writeFileSync(
    script,
    `set timeout 20
spawn env SFMC_CONFIG_PATH=${configPath} ${process.execPath} ${BIN} add --no-verify
expect "Business unit name*: "
send "Marketing BU\\r"
expect "Subdomain: "
send "mc789xyz\\r"
expect "Client ID: "
send "my-client-id\\r"
expect "Client secret (not echoed): "
send "${secret}\\r"
expect "MID / account ID*: "
send "\\r"
expect eof
catch wait result
exit [lindex $result 3]
`
  );

  const result = spawnSync("expect", ["-f", script], { encoding: "utf-8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);

  // Typed characters must never reach the terminal.
  assert.doesNotMatch(result.stdout, new RegExp(secret));

  const [stored] = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  assert.equal(stored.client_secret, secret);
  assert.equal(stored.business_unit_name, "Marketing BU");
});

test("a secret cannot be prompted for without a terminal", () => {
  const result = run(["add", "--no-verify", "--name", "N", "--subdomain", "s", "--client-id", "c"], {
    env: { SFMC_CONFIG_PATH: freshConfigPath() },
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--client-secret|SFMC_CLIENT_SECRET/);
});

test("the server logs which config it loaded and warns about a shadowed one", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-sfmc-shadow-"));
  const pinned = path.join(dir, "pinned.json");
  const xdgHome = path.join(dir, "xdg");

  run(addArgs("Primary"), { env: { SFMC_CONFIG_PATH: pinned } });
  run(addArgs("Shadowed"), { env: { XDG_CONFIG_HOME: xdgHome } });

  const result = run([], { env: { SFMC_CONFIG_PATH: pinned, XDG_CONFIG_HOME: xdgHome }, input: "" });

  assert.match(result.stderr, /config .*pinned\.json \(from SFMC_CONFIG_PATH\)/);
  assert.match(result.stderr, /loaded 1 business unit\(s\): Primary/);
  assert.match(result.stderr, /warning: .*xdg.*accounts\.json also holds 1 business unit\(s\)/);
});

test("sfmc_list_business_units reports the config source and any shadowed config", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-sfmc-listbu-"));
  const pinned = path.join(dir, "pinned.json");
  const xdgHome = path.join(dir, "xdg");

  run(addArgs("Primary"), { env: { SFMC_CONFIG_PATH: pinned } });
  run(addArgs("Shadowed"), { env: { XDG_CONFIG_HOME: xdgHome } });

  const messages = [
    {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      },
    },
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "sfmc_list_business_units", arguments: {} },
    },
  ]
    .map((m) => JSON.stringify(m))
    .join("\n");

  const result = run([], {
    env: { SFMC_CONFIG_PATH: pinned, XDG_CONFIG_HOME: xdgHome },
    input: `${messages}\n`,
  });

  const call = result.stdout
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l))
    .find((m) => m.id === 2);

  const payload = JSON.parse(call.result.content[0].text);
  assert.deepEqual(payload.business_units, ["Primary"]);
  assert.match(payload.config_source, /pinned\.json \(from SFMC_CONFIG_PATH\)/);
  assert.equal(payload.warning.length, 1);
  assert.match(payload.warning[0], /also holds 1 business unit\(s\)/);
});

test("list warns when another config holds business units", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-sfmc-listwarn-"));
  const pinned = path.join(dir, "pinned.json");
  const xdgHome = path.join(dir, "xdg");

  run(addArgs("Primary"), { env: { SFMC_CONFIG_PATH: pinned } });
  run(addArgs("Shadowed"), { env: { XDG_CONFIG_HOME: xdgHome } });

  const listed = run(["list"], { env: { SFMC_CONFIG_PATH: pinned, XDG_CONFIG_HOME: xdgHome } });
  assert.equal(listed.status, 0);
  assert.match(listed.stderr, /also holds 1 business unit\(s\)/);
});
