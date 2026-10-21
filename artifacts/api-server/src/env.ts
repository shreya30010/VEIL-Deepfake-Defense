import fs from "node:fs";
import path from "node:path";

/**
 * Loads KEY=VALUE pairs from the first .env file found (repo root or current folder).
 * Imported FIRST in index.ts so that secrets are available before any other module
 * (for example lib/auth.ts) reads process.env. Does not override variables that are
 * already set, and works on every Node version (no process.loadEnvFile needed).
 */
function loadDotEnv(): string | null {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), "../.env"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf-8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
    return file;
  }
  return null;
}

export const loadedEnvFile = loadDotEnv();

/** True when a secret is missing, too short, or still the .env.example placeholder. */
export function isUnsetSecret(value: string | undefined, minLength = 16): boolean {
  return !value || value.length < minLength || /^replace_with/i.test(value);
}
