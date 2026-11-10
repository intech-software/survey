// Creates backend/.env from .env.example with a freshly generated JWT_SECRET.
// Usage: npm run env:init   (add --force to overwrite an existing .env)
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const examplePath = path.join(root, '.env.example');
const envPath = path.join(root, '.env');
const force = process.argv.includes('--force');

if (fs.existsSync(envPath) && !force) {
  console.log('.env already exists - nothing changed (use --force to overwrite).');
  process.exit(0);
}

const secret = crypto.randomBytes(48).toString('hex');
const content = fs
  .readFileSync(examplePath, 'utf8')
  .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`);

fs.writeFileSync(envPath, content);
console.log('Created .env with a new random JWT_SECRET.');
