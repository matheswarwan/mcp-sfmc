import fs from "fs";
import readline from "readline/promises";
import axios from "axios";
import { SFMCAccount } from "./types.js";
import {
  isPermissive,
  normalizeAccount,
  readAccountsFile,
  resolveConfigPath,
  writeAccountsFile,
} from "./config.js";
import { getAccessToken } from "./auth.js";
import { packageVersion } from "./version.js";

const BOLD = "\u001b[1m";
const DIM = "\u001b[2m";
const RED = "\u001b[31m";
const GREEN = "\u001b[32m";
const YELLOW = "\u001b[33m";
const RESET = "\u001b[0m";

const color = (code: string, text: string): string =>
  process.stdout.isTTY ? `${code}${text}${RESET}` : text;

const out = (text = ""): void => {
  process.stdout.write(`${text}\n`);
};

/** CLI diagnostics go to stderr so stdout stays parseable. */
const warn = (text: string): void => {
  process.stderr.write(`${text}\n`);
};

export class CliError extends Error {}

// ---------------------------------------------------------------------------
// Prompting
// ---------------------------------------------------------------------------

function isInteractive(): boolean {
  return process.stdin.isTTY === true;
}

/** Ctrl+D or a closed stdin should read as "the user gave up", not as a crash. */
async function question(rl: readline.Interface, prompt: string): Promise<string> {
  try {
    return await rl.question(prompt);
  } catch {
    throw new CliError("Cancelled.");
  }
}

async function ask(prompt: string, { required = true, fallback = "" } = {}): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const suffix = fallback ? color(DIM, ` [${fallback}]`) : "";
      const answer = (await question(rl, `${prompt}${suffix}: `)).trim();
      if (answer) return answer;
      if (fallback) return fallback;
      if (!required) return "";
      out(color(RED, "  A value is required."));
    }
  } finally {
    rl.close();
  }
}

/**
 * Prompt without echoing what is typed.
 *
 * Reads raw bytes rather than driving readline, because readline echoes through
 * internals that are not part of its public API and cannot be muted reliably.
 */
async function askSecret(label: string): Promise<string> {
  const stdin = process.stdin;

  if (!stdin.isTTY) {
    // No terminal to hide anything from; a value must come from a flag or the environment.
    throw new CliError(
      "Cannot prompt for a secret without a terminal. Pass --client-secret or set SFMC_CLIENT_SECRET."
    );
  }

  process.stdout.write(`${label}: `);

  const previousRawMode = stdin.isRaw === true;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf-8");

  return new Promise<string>((resolve, reject) => {
    let value = "";

    const cleanup = (): void => {
      stdin.off("data", onData);
      stdin.setRawMode(previousRawMode);
      stdin.pause();
    };

    const finish = (result: string): void => {
      cleanup();
      process.stdout.write("\n");
      resolve(result.trim());
    };

    const cancel = (): void => {
      cleanup();
      process.stdout.write("\n");
      reject(new CliError("Cancelled."));
    };

    const onData = (chunk: string): void => {
      for (const char of chunk) {
        switch (char) {
          case "\r":
          case "\n":
            finish(value);
            return;
          case "\u0003": // Ctrl+C
            cancel();
            return;
          case "\u0004": // Ctrl+D
            if (value === "") {
              cancel();
              return;
            }
            finish(value);
            return;
          case "\u007f": // Backspace
          case "\b":
            value = value.slice(0, -1);
            break;
          default:
            // Ignore other control characters, such as arrow key escape sequences.
            if (char >= " ") value += char;
        }
      }
    };

    stdin.on("data", onData);
  });
}

async function confirm(label: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = (await ask(`${label} (${hint})`, { required: false })).toLowerCase();
  if (!answer) return defaultYes;
  return answer === "y" || answer === "yes";
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

type Flags = Record<string, string | boolean>;

function parseFlags(argv: string[]): { positional: string[]; flags: Flags } {
  const positional: string[] = [];
  const flags: Flags = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const eq = key.indexOf("=");
    if (eq !== -1) {
      flags[key.slice(0, eq)] = key.slice(eq + 1);
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
      flags[key] = argv[++i];
    } else {
      flags[key] = true;
    }
  }

  return { positional, flags };
}

const flagString = (flags: Flags, name: string): string | undefined =>
  typeof flags[name] === "string" ? (flags[name] as string) : undefined;

// ---------------------------------------------------------------------------
// SFMC verification
// ---------------------------------------------------------------------------

interface TokenContext {
  mid?: string;
  orgName?: string;
}

/**
 * Ask SFMC who this token belongs to, so "add" can fill in the MID for the user.
 * Best effort: the endpoint is not essential to a working config, so failures are ignored.
 */
async function fetchTokenContext(restUrl: string, token: string): Promise<TokenContext> {
  try {
    const response = await axios.get(`${restUrl.replace(/\/$/, "")}/platform/v1/tokenContext`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
    const data = response.data as Record<string, Record<string, unknown> | undefined>;
    const org = data?.organization ?? {};
    const mid = org.id ?? org.memberId ?? org.enterpriseId;
    const orgName = org.name ?? org.orgName;
    return {
      mid: mid === undefined || mid === null ? undefined : String(mid),
      orgName: typeof orgName === "string" ? orgName : undefined,
    };
  } catch {
    return {};
  }
}

/** Request a token for an account. Throws a readable error when SFMC rejects it. */
async function verifyAccount(account: SFMCAccount): Promise<TokenContext> {
  const config = normalizeAccount(account);
  try {
    const { token, restUrl } = await getAccessToken(config);
    return await fetchTokenContext(restUrl, token);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data as Record<string, unknown> | undefined;
        const detail =
          (data?.error_description as string) || (data?.message as string) || JSON.stringify(data);

        // Only a 4xx says anything about the credentials. A 5xx is SFMC, or a
        // proxy between you and SFMC, and retrying is the right advice.
        if (status >= 500) {
          throw new CliError(
            `SFMC returned HTTP ${status}: ${detail}. This is a server or proxy error rather than a credential problem, so the credentials were not checked. Try again, and check any corporate proxy or VPN.`
          );
        }
        throw new CliError(`SFMC rejected the credentials (HTTP ${status}): ${detail}`);
      }
      if (error.code === "ENOTFOUND" || error.code === "EAI_AGAIN") {
        throw new CliError(
          `Could not reach https://${account.subdomain}.auth.marketingcloudapis.com. Check the subdomain and your network.`
        );
      }
      throw new CliError(`Request to SFMC failed: ${error.message}`);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const redact = (secret: string): string =>
  secret.length <= 4 ? "****" : `${"*".repeat(8)}${secret.slice(-4)}`;

function warnIfPermissive(filePath: string): void {
  if (isPermissive(filePath)) {
    warn(
      color(YELLOW, `Warning: ${filePath} is readable by other users. Run: chmod 600 "${filePath}"`)
    );
  }
}

function findIndexByName(accounts: SFMCAccount[], name: string): number {
  return accounts.findIndex((a) => a.business_unit_name.toLowerCase() === name.toLowerCase());
}

function registrationSnippet(filePath: string): string {
  const envFlag =
    filePath === resolveConfigPathWithoutOverride()
      ? ""
      : ` --env SFMC_CONFIG_PATH=${filePath}`;
  return `claude mcp add sfmc --scope user${envFlag} -- mcp-sfmc`;
}

/** The default path, ignoring any SFMC_CONFIG_PATH currently set. */
function resolveConfigPathWithoutOverride(): string {
  const saved = process.env.SFMC_CONFIG_PATH;
  delete process.env.SFMC_CONFIG_PATH;
  try {
    return resolveConfigPath();
  } finally {
    if (saved !== undefined) process.env.SFMC_CONFIG_PATH = saved;
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function collectAccount(flags: Flags, existingNames: string[]): Promise<SFMCAccount> {
  const interactive = isInteractive();

  const fromFlag = {
    name: flagString(flags, "name"),
    subdomain: flagString(flags, "subdomain"),
    clientId: flagString(flags, "client-id"),
    clientSecret: flagString(flags, "client-secret") ?? process.env.SFMC_CLIENT_SECRET,
    accountId: flagString(flags, "account-id"),
  };

  if (!interactive) {
    const missing = (["name", "subdomain", "client-id", "client-secret"] as const).filter((key) => {
      const map: Record<string, string | undefined> = {
        name: fromFlag.name,
        subdomain: fromFlag.subdomain,
        "client-id": fromFlag.clientId,
        "client-secret": fromFlag.clientSecret,
      };
      return !map[key];
    });
    if (missing.length > 0) {
      throw new CliError(
        `Not running interactively, so these flags are required: ${missing.map((m) => `--${m}`).join(", ")}. The secret may also be passed as SFMC_CLIENT_SECRET.`
      );
    }
  }

  const name =
    fromFlag.name ??
    (await ask("Business unit name (how you will refer to it in chat)"));

  if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    throw new CliError(
      `A business unit named "${name}" already exists. Remove it first with: mcp-sfmc remove "${name}"`
    );
  }

  if (!fromFlag.subdomain && interactive) {
    out(
      color(
        DIM,
        "  The subdomain is the 28 character tenant string in your SFMC URLs,\n  e.g. mc563885gzs27c5t9-63k636ttgm.auth.marketingcloudapis.com"
      )
    );
  }

  const subdomain = (fromFlag.subdomain ?? (await ask("Subdomain")))
    .replace(/^https?:\/\//, "")
    .replace(/\.(auth|rest|soap)\.marketingcloudapis\.com\/?$/, "")
    .trim();

  const clientId = fromFlag.clientId ?? (await ask("Client ID"));
  const clientSecret = fromFlag.clientSecret ?? (await askSecret("Client secret (not echoed)"));
  const accountId =
    fromFlag.accountId ??
    (interactive ? await ask("MID / account ID (blank to detect)", { required: false }) : "");

  const account: SFMCAccount = {
    business_unit_name: name,
    subdomain,
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  };
  if (accountId) account.account_id = accountId;

  return account;
}

async function cmdAdd(flags: Flags): Promise<number> {
  const filePath = resolveConfigPath();
  const accounts = readAccountsFile(filePath);

  const account = await collectAccount(
    flags,
    accounts.map((a) => a.business_unit_name)
  );

  if (flags["no-verify"]) {
    warn(color(YELLOW, "Skipping credential verification (--no-verify)."));
  } else {
    out();
    out("Verifying credentials with SFMC...");
    const context = await verifyAccount(account);
    out(color(GREEN, "  Authenticated successfully."));

    if (!account.account_id && context.mid) {
      account.account_id = context.mid;
      out(color(GREEN, `  Detected MID ${context.mid}${context.orgName ? ` (${context.orgName})` : ""}.`));
    }
  }

  accounts.push(account);
  writeAccountsFile(accounts, filePath);

  out();
  out(color(GREEN, `Added "${account.business_unit_name}" to ${filePath}`));
  warnIfPermissive(filePath);
  return 0;
}

async function cmdInit(flags: Flags): Promise<number> {
  const filePath = resolveConfigPath();
  const existing = readAccountsFile(filePath);

  out(color(BOLD, "mcp-sfmc setup"));
  out();
  out(`Config file: ${filePath}`);

  if (existing.length > 0) {
    out(
      color(
        YELLOW,
        `This file already has ${existing.length} business unit(s). "init" will add another.`
      )
    );
    if (isInteractive() && !(await confirm("Continue?"))) return 0;
  }

  out();
  const code = await cmdAdd(flags);
  if (code !== 0) return code;

  out();
  out(color(BOLD, "Register the server with your client:"));
  out();
  out(`  ${registrationSnippet(filePath)}`);
  out();
  out(color(DIM, "  For Cursor, VS Code, Windsurf and others, see the README."));
  return 0;
}

function cmdList(): number {
  const filePath = resolveConfigPath();
  const accounts = readAccountsFile(filePath);

  out(`Config file: ${filePath}`);
  out();

  if (accounts.length === 0) {
    out('No business units configured. Run "mcp-sfmc init" to add one.');
    return 0;
  }

  accounts.forEach((a, i) => {
    const marker = i === 0 ? color(DIM, "  (default)") : "";
    out(`${color(BOLD, a.business_unit_name)}${marker}`);
    out(`  subdomain:     ${a.subdomain}`);
    out(`  client_id:     ${a.client_id}`);
    out(`  client_secret: ${redact(a.client_secret || "")}`);
    out(`  account_id:    ${a.account_id || color(DIM, "(not set)")}`);
    out();
  });

  warnIfPermissive(filePath);
  return 0;
}

async function cmdTest(positional: string[]): Promise<number> {
  const filePath = resolveConfigPath();
  const accounts = readAccountsFile(filePath);

  if (accounts.length === 0) {
    throw new CliError(`No business units configured in ${filePath}.`);
  }

  const target = positional[0];
  const selected = target
    ? accounts.filter((a) => a.business_unit_name.toLowerCase() === target.toLowerCase())
    : accounts;

  if (selected.length === 0) {
    throw new CliError(
      `Business unit "${target}" not found. Configured: ${accounts.map((a) => `"${a.business_unit_name}"`).join(", ")}`
    );
  }

  let failures = 0;
  for (const account of selected) {
    process.stdout.write(`${account.business_unit_name}... `);
    try {
      const context = await verifyAccount(account);
      const mid = account.account_id || context.mid;
      out(color(GREEN, `ok${mid ? ` (MID ${mid})` : ""}`));
    } catch (error: unknown) {
      failures++;
      out(color(RED, "failed"));
      out(`  ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return failures === 0 ? 0 : 1;
}

async function cmdRemove(positional: string[], flags: Flags): Promise<number> {
  const name = positional[0];
  if (!name) throw new CliError("Usage: mcp-sfmc remove <business unit name>");

  const filePath = resolveConfigPath();
  const accounts = readAccountsFile(filePath);
  const index = findIndexByName(accounts, name);

  if (index === -1) {
    throw new CliError(
      `Business unit "${name}" not found. Configured: ${accounts.map((a) => `"${a.business_unit_name}"`).join(", ") || "(none)"}`
    );
  }

  const [removed] = accounts.slice(index, index + 1);

  if (isInteractive() && !flags.yes && !flags.force) {
    const ok = await confirm(`Remove "${removed.business_unit_name}" from ${filePath}?`, false);
    if (!ok) {
      out("Cancelled.");
      return 0;
    }
  }

  accounts.splice(index, 1);
  writeAccountsFile(accounts, filePath);
  out(color(GREEN, `Removed "${removed.business_unit_name}".`));
  return 0;
}

function cmdPath(): number {
  const filePath = resolveConfigPath();
  out(filePath);
  return fs.existsSync(filePath) ? 0 : 1;
}

function cmdHelp(): number {
  out(`${color(BOLD, "mcp-sfmc")} - MCP server for Salesforce Marketing Cloud

${color(BOLD, "Usage")}
  mcp-sfmc                       Start the MCP server on stdio (what MCP clients run)
  mcp-sfmc init                  Set up the config file and add your first business unit
  mcp-sfmc add                   Add another business unit
  mcp-sfmc list                  List configured business units
  mcp-sfmc test [name]           Request a token for one or all business units
  mcp-sfmc remove <name>         Remove a business unit
  mcp-sfmc path                  Print the config file path
  mcp-sfmc help                  Show this help

${color(BOLD, "Flags for add / init")}
  --name <name>                  Business unit name used in chat
  --subdomain <subdomain>        Tenant subdomain
  --client-id <id>               Installed package client ID
  --client-secret <secret>       Client secret (or set SFMC_CLIENT_SECRET)
  --account-id <mid>             MID; detected automatically when omitted
  --no-verify                    Save without checking the credentials against SFMC

${color(BOLD, "Config file")}
  Resolved in this order:
    1. $SFMC_CONFIG_PATH
    2. $XDG_CONFIG_HOME/sfmc/accounts.json
    3. ~/.config/sfmc/accounts.json
  Written with 0600 permissions. A single business unit can instead be supplied
  through SFMC_SUBDOMAIN, SFMC_CLIENT_ID, SFMC_CLIENT_SECRET and SFMC_ACCOUNT_ID.
`);
  return 0;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function runCli(argv: string[]): Promise<number> {
  const { positional, flags } = parseFlags(argv);
  const command = positional[0];
  const rest = positional.slice(1);

  if (flags.version || command === "version") {
    out(packageVersion());
    return 0;
  }

  if (flags.help || flags.h) return cmdHelp();

  switch (command) {
    case "init":
      return cmdInit(flags);
    case "add":
      return cmdAdd(flags);
    case "list":
    case "ls":
      return cmdList();
    case "test":
      return cmdTest(rest);
    case "remove":
    case "rm":
      return cmdRemove(rest, flags);
    case "path":
      return cmdPath();
    case "help":
    case undefined:
      return cmdHelp();
    default:
      throw new CliError(`Unknown command "${command}". Run "mcp-sfmc help" for usage.`);
  }
}
