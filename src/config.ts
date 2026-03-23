import fs from "fs";
import { SFMCAccount, SFMCConfig } from "./types.js";

let accounts: SFMCConfig[] | null = null;

export function loadAccounts(): SFMCConfig[] {
  if (accounts) return accounts;

  const configPath = process.env.SFMC_CONFIG_PATH;
  if (!configPath) {
    throw new Error(
      "SFMC_CONFIG_PATH environment variable is required. Point it to a JSON file containing an array of business unit credentials."
    );
  }

  let raw: string;
  try {
    raw = fs.readFileSync(configPath, "utf-8");
  } catch {
    throw new Error(`Failed to read SFMC config file at: ${configPath}`);
  }

  let parsed: SFMCAccount[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`SFMC config file is not valid JSON: ${configPath}`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("SFMC config file must be a non-empty array of business unit accounts.");
  }

  accounts = parsed.map((a) => {
    if (!a.business_unit_name || !a.subdomain || !a.client_id || !a.client_secret) {
      throw new Error(
        `Invalid account entry "${a.business_unit_name || "unknown"}": missing required fields (business_unit_name, subdomain, client_id, client_secret).`
      );
    }
    return {
      businessUnitName: a.business_unit_name,
      subdomain: a.subdomain,
      clientId: a.client_id,
      clientSecret: a.client_secret,
      accountId: a.account_id,
    };
  });

  return accounts;
}

export function getAccount(name?: string): SFMCConfig {
  const all = loadAccounts();

  if (!name) return all[0];

  const match = all.find(
    (a) => a.businessUnitName.toLowerCase() === name.toLowerCase()
  );

  if (!match) {
    const available = all.map((a) => `"${a.businessUnitName}"`).join(", ");
    throw new Error(
      `Business unit "${name}" not found. Available business units: ${available}`
    );
  }

  return match;
}
