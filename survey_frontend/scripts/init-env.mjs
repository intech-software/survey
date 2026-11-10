// Creates survey_frontend/.env from .env.example.
// Usage: npm run env:init   (add --force to overwrite an existing .env)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const examplePath = path.join(root, ".env.example");
const envPath = path.join(root, ".env");
const force = process.argv.includes("--force");

if (fs.existsSync(envPath) && !force) {
  console.log(".env already exists - nothing changed (use --force to overwrite).");
  process.exit(0);
}

fs.copyFileSync(examplePath, envPath);
console.log("Created .env:\n");
console.log(fs.readFileSync(envPath, "utf8"));
