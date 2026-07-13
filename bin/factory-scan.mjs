#!/usr/bin/env node
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { arch, platform } from 'node:os';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import {
  assertConfigIdentity,
  readConfig,
  validateReport,
} from '../lib/factory/contract.mjs';
import { scanWithAcknowledgements } from '../lib/factory/scan.mjs';

function fail(message) {
  process.stderr.write(`[factory-scan] ${message}\n`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    if (!['--config', '--output', '--ack-output', '--cwd'].includes(key) || !argv[index + 1] || options[key]) {
      throw new Error('使い方: factory-scan --config <file> --output <file> [--ack-output <file>] [--cwd <project>]');
    }
    options[key.slice(2)] = argv[++index];
  }
  if (!options.config || !options.output) throw new Error('--config と --output が必要です');
  return options;
}

let temporaryOutput;
try {
  const options = parseArgs(process.argv.slice(2));
  const config = await readConfig(options.config);
  const { report, acknowledgements } = await scanWithAcknowledgements({
    host: config.host,
    cwd: options.cwd || process.cwd(),
    arch: arch(),
    platform: platform(),
    collectionEnabled: config.collection.enabled,
  });
  validateReport(report);
  assertConfigIdentity(config, report);

  const output = resolve(options.output);
  await mkdir(dirname(output), { recursive: true });
  temporaryOutput = `${output}.${process.pid}.tmp`;
  await writeFile(temporaryOutput, JSON.stringify(report), { mode: 0o600 });
  await rename(temporaryOutput, output);
  temporaryOutput = null;
  let acknowledgementOutput = null;
  if (options['ack-output']) {
    acknowledgementOutput = resolve(options['ack-output']);
    await mkdir(dirname(acknowledgementOutput), { recursive: true });
    temporaryOutput = `${acknowledgementOutput}.${process.pid}.tmp`;
    await writeFile(temporaryOutput, JSON.stringify(acknowledgements), { mode: 0o600 });
    await rename(temporaryOutput, acknowledgementOutput);
    temporaryOutput = null;
  }
  process.stdout.write(`${JSON.stringify({ ok: true, report_id: report.report_id, output, acknowledgement_output: acknowledgementOutput })}\n`);
} catch (error) {
  if (temporaryOutput) await rm(temporaryOutput, { force: true });
  fail(error?.message || '失敗');
}
