import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { SFMCConfig } from "../types.js";
import { restRequest } from "../client.js";

// Ported from the EmailValidator project: validate a batch of addresses and
// report only the failures, plus an offline hint when the domain looks like a
// typo of a common provider. SMTP mailbox probing from the original is left
// out on purpose: port 25 is usually blocked, it is slow, and probing mail
// servers can get the caller's IP blocklisted.

export const SFMC_VALIDATORS = ["SyntaxValidator", "MXValidator", "ListDetectiveValidator"];

export const COMMON_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "yandex.com",
  "comcast.net",
  "verizon.net",
  "att.net",
  "sbcglobal.net",
  "shaw.ca",
  "rogers.com",
  "sympatico.ca",
];

const MAX_EMAILS = 500;

export const emailValidationTools: Tool[] = [
  {
    name: "sfmc_validate_emails",
    description:
      "Validate a batch of email addresses (up to 500) with the SFMC Address API and report which fail and why. Also flags domains that look like typos of common providers (e.g. gmial.com -> gmail.com), which SFMC does not catch. By default only problem addresses are returned.",
    inputSchema: {
      type: "object",
      properties: {
        emails: {
          type: "array",
          items: { type: "string" },
          description: "Email addresses to validate. Duplicates are checked once.",
        },
        validators: {
          type: "array",
          items: { type: "string", enum: SFMC_VALIDATORS },
          description: "SFMC validators to run. Default: all of SyntaxValidator, MXValidator, ListDetectiveValidator.",
        },
        includeValid: { type: "boolean", description: "Also list addresses that passed. Default false." },
        concurrency: { type: "number", description: "Parallel API calls. Default 5, max 10." },
      },
      required: ["emails"],
    },
  },
];

// Optimal string alignment distance (Levenshtein plus adjacent swaps), so
// "gmial" is one edit from "gmail" rather than two.
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// Returns the address with a corrected domain, or undefined when the domain is
// already a known provider or nothing is close enough.
export function suggestDomainFix(email: string): string | undefined {
  const at = email.lastIndexOf("@");
  if (at < 1) return undefined;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (domain === "" || COMMON_DOMAINS.includes(domain)) return undefined;

  let best: string | undefined;
  let bestDistance = Infinity;
  for (const candidate of COMMON_DOMAINS) {
    const dist = editDistance(domain, candidate);
    if (dist < bestDistance) {
      best = candidate;
      bestDistance = dist;
    }
  }
  // Two edits is plenty for typos; more starts flagging real domains.
  return best && bestDistance <= 2 ? `${local}@${best}` : undefined;
}

export function normalizeEmails(emails: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of emails) {
    const email = String(e ?? "").trim();
    if (email === "") continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

interface SfmcValidateResponse {
  email?: string;
  valid?: boolean;
  failedValidation?: string;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function handleEmailValidationTool(
  name: string,
  args: Record<string, unknown>,
  config: SFMCConfig
): Promise<unknown> {
  if (name !== "sfmc_validate_emails") throw new Error(`Unknown email validation tool: ${name}`);

  const emails = normalizeEmails(Array.isArray(args.emails) ? args.emails : []);
  if (emails.length === 0) throw new Error("emails must contain at least one address");
  if (emails.length > MAX_EMAILS) {
    throw new Error(`Too many addresses (${emails.length}); send at most ${MAX_EMAILS} per call`);
  }

  const validators = (args.validators as string[] | undefined) ?? SFMC_VALIDATORS;
  const includeValid = args.includeValid === true;
  const rawConcurrency = typeof args.concurrency === "number" ? Math.floor(args.concurrency) : 5;
  const concurrency = Math.min(10, Math.max(1, rawConcurrency));

  const results = await mapWithConcurrency(emails, concurrency, async (email) => {
    const suggestion = suggestDomainFix(email);
    try {
      const resp = (await restRequest(config, "POST", "address/v1/validateEmail", {
        email,
        validators,
      })) as SfmcValidateResponse;
      return {
        email,
        valid: resp.valid === true,
        ...(resp.failedValidation ? { failedValidation: resp.failedValidation } : {}),
        ...(suggestion ? { didYouMean: suggestion } : {}),
      };
    } catch (error: unknown) {
      return {
        email,
        valid: false,
        error: error instanceof Error ? error.message : String(error),
        ...(suggestion ? { didYouMean: suggestion } : {}),
      };
    }
  });

  // An address SFMC accepts can still be a typo (gmial.com has MX records),
  // so a suggestion alone makes it worth reporting.
  const problems = results.filter((r) => !r.valid || "didYouMean" in r);
  return {
    checked: results.length,
    validCount: results.filter((r) => r.valid).length,
    invalidCount: results.filter((r) => !r.valid).length,
    possibleTypoCount: results.filter((r) => "didYouMean" in r).length,
    validators,
    results: includeValid ? results : problems,
  };
}
