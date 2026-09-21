import fs from "fs";
import path from "path";

/** Read the version from the installed package manifest rather than duplicating it in source. */
export function packageVersion(): string {
  const candidates = [
    path.join(__dirname, "..", "package.json"),
    path.join(__dirname, "..", "..", "package.json"),
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf-8")) as { name?: string; version?: string };
      if (parsed.name === "mcp-sfmc" && parsed.version) return parsed.version;
    } catch {
      // try the next candidate
    }
  }

  return "0.0.0";
}
