import fs from "fs";
import os from "os";
import path from "path";
import { SFMCAccount, SFMCConfig } from "./types.js";

interface CacheEntry {
  accounts: SFMCConfig[];
  path: string;
  mtimeMs: number;
}

let cache: CacheEntry | null = null;

/**
 * Where the accounts file lives, in precedence order:
 *   1. $SFMC_CONFIG_PATH
 *   2. $XDG_CONFIG_HOME/sfmc/accounts.json
 *   3. ~/.config/sfmc/accounts.json
 */
export function resolveConfigPath(): string {
  const explicit = process.env.SFMC_CONFIG_PATH;
  if (explicit) return explicit;

  const xdg = process.env.XDG_CONFIG_HOME;
  const base = xdg && xdg.trim() !== "" ? xdg : path.join(os.homedir(), ".config");
  return path.join(base, "sfmc", "accounts.json");
}

/** True when the file is readable by group or others, which is wrong for a file holding client secrets. */
export function isPermissive(filePath: string): boolean {
  try {
    return (fs.statSync(filePath).mode & 0o077) !== 0;
  } catch {
    return false;
  }
}

/** Read the accounts file in its on-disk (snake_case) shape. Returns [] when the file does not exist. */
export function readAccountsFile(filePath = resolveConfigPath()): SFMCAccount[] {
  if (!fs.existsSync(filePath)) return [];

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    throw new Error(`Failed to read SFMC config file at: ${filePath}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`SFMC config file is not valid JSON: ${filePath}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`SFMC config file must contain an array of business unit accounts: ${filePath}`);
  }

  return parsed as SFMCAccount[];
}

/** Write the accounts file atomically with 0600 permissions, creating parent directories as needed. */
export function writeAccountsFile(accounts: SFMCAccount[], filePath = resolveConfigPath()): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });

  const tmp = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(accounts, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, filePath);
  fs.chmodSync(filePath, 0o600);

  // The server process may be long lived; make sure it notices its own writes.
  cache = null;
}

/** Single business unit supplied entirely through the environment, for containers and CI. */
function accountFromEnv(): SFMCAccount | null {
  const { SFMC_SUBDOMAIN, SFMC_CLIENT_ID, SFMC_CLIENT_SECRET } = process.env;
  if (!SFMC_SUBDOMAIN || !SFMC_CLIENT_ID || !SFMC_CLIENT_SECRET) return null;

  return {
    business_unit_name: process.env.SFMC_BUSINESS_UNIT_NAME || "Default",
    subdomain: SFMC_SUBDOMAIN,
    grant_type: "client_credentials",
    client_id: SFMC_CLIENT_ID,
    client_secret: SFMC_CLIENT_SECRET,
    account_id: process.env.SFMC_ACCOUNT_ID,
  };
}

export function normalizeAccount(a: SFMCAccount): SFMCConfig {
  if (!a || !a.business_unit_name || !a.subdomain || !a.client_id || !a.client_secret) {
    throw new Error(
      `Invalid account entry "${a?.business_unit_name || "unknown"}": missing required fields (business_unit_name, subdomain, client_id, client_secret).`
    );
  }
  return {
    businessUnitName: a.business_unit_name,
    subdomain: a.subdomain,
    clientId: a.client_id,
    clientSecret: a.client_secret,
    accountId: a.account_id,
  };
}

export function loadAccounts(): SFMCConfig[] {
  const env = accountFromEnv();
  if (env) return [normalizeAccount(env)];

  const filePath = resolveConfigPath();

  let mtimeMs: number;
  try {
    mtimeMs = fs.statSync(filePath).mtimeMs;
  } catch {
    throw new Error(
      `No SFMC accounts configured. Expected a config file at ${filePath}. Run "mcp-sfmc init" to create one, or set SFMC_CONFIG_PATH to an existing file.`
    );
  }

  // Re-read when the file changed, so "mcp-sfmc add" takes effect without restarting the client.
  if (cache && cache.path === filePath && cache.mtimeMs === mtimeMs) {
    return cache.accounts;
  }

  const parsed = readAccountsFile(filePath);
  if (parsed.length === 0) {
    throw new Error(
      `SFMC config file has no accounts: ${filePath}. Run "mcp-sfmc add" to add a business unit.`
    );
  }

  const accounts = parsed.map(normalizeAccount);
  cache = { accounts, path: filePath, mtimeMs };
  return accounts;
}

export function getAccount(name?: string): SFMCConfig {
  const all = loadAccounts();

  if (!name) return all[0];

  const match = all.find((a) => a.businessUnitName.toLowerCase() === name.toLowerCase());

  if (!match) {
    const available = all.map((a) => `"${a.businessUnitName}"`).join(", ");
    throw new Error(`Business unit "${name}" not found. Available business units: ${available}`);
  }

  return match;
}

/** Test seam: drop the in-memory cache. */
export function clearAccountsCache(): void {
  cache = null;
}
