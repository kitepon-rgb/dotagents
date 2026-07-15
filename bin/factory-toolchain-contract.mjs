#!/usr/bin/env node

import {
  compareSemver,
  parseGrokUpdateJson,
  parseNpmLatestJson,
} from '../lib/factory/toolchain-contract.mjs';

try {
  const [operation, ...args] = process.argv.slice(2);
  if (operation === 'compare' && args.length === 2) {
    process.stdout.write(`${compareSemver(args[0], args[1])}\n`);
  } else if (operation === 'npm-latest' && args.length === 0) {
    process.stdout.write(`${parseNpmLatestJson(await readStdin())}\n`);
  } else if ((operation === 'grok-check' || operation === 'grok-post') && args.length === 0) {
    const value = parseGrokUpdateJson(await readStdin(), { postUpdate: operation === 'grok-post' });
    process.stdout.write(`${JSON.stringify(value)}\n`);
  } else {
    throw new Error('usage');
  }
} catch (error) {
  const allowed = new Set([
    'downgrade_refused',
    'grok_post_update_incomplete',
    'grok_update_inconsistent',
    'grok_update_json',
    'grok_update_schema',
    'npm_latest_json',
    'version_schema',
    'version_type',
  ]);
  const code = allowed.has(error?.code) ? error.code : 'invalid_input';
  process.stderr.write(`[factory-toolchain-contract] ${code}\n`);
  process.exitCode = 1;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    process.stdin.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > 64 * 1024) {
        reject(new Error('stdin_too_large'));
        process.stdin.destroy();
      } else chunks.push(Buffer.from(chunk));
    });
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', reject);
  });
}
