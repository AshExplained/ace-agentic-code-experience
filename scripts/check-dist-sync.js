#!/usr/bin/env node

/**
 * Checks that hooks/dist/ files are in sync with source hooks.
 * Prevents committing stale dist files.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOOK_PAIRS = [
  ['hooks/renn-check-update.js', 'hooks/dist/renn-check-update.js'],
  ['hooks/renn-statusline.js', 'hooks/dist/renn-statusline.js'],
];

const errors = [];

for (const [src, dist] of HOOK_PAIRS) {
  const srcPath = path.join(ROOT, src);
  const distPath = path.join(ROOT, dist);

  if (!fs.existsSync(srcPath)) continue;

  if (!fs.existsSync(distPath)) {
    errors.push(`${dist} does not exist — run "npm run build:hooks"`);
    continue;
  }

  const srcContent = fs.readFileSync(srcPath, 'utf-8');
  const distContent = fs.readFileSync(distPath, 'utf-8');

  if (srcContent !== distContent) {
    errors.push(`${dist} is out of sync with ${src} — run "npm run build:hooks"`);
  }
}

if (errors.length > 0) {
  console.log('\n✗ Dist sync check failed:\n');
  for (const e of errors) console.log(`  ${e}`);
  process.exit(1);
} else {
  console.log('✓ hooks/dist/ is in sync');
}
