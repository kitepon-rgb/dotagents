#!/usr/bin/env node
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { arch, platform } from 'node:os';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { assertConfigIdentity, readConfig, validateReportV5 } from '../lib/factory/contract.mjs';
import { scanV5WithAcknowledgements } from '../lib/factory/v5.mjs';

function parse(argv) { const out = {}; for (let i = 0; i < argv.length; i += 1) { const key = argv[i]; if (!['--config', '--output', '--ack-output', '--cwd'].includes(key) || !argv[i + 1] || out[key]) throw new Error('使い方: factory-scan-v5 --config <file> --output <file> [--ack-output <file>] [--cwd <project>]'); out[key] = argv[++i]; } if (!out['--config'] || !out['--output']) throw new Error('--config と --output が必要です'); return out; }
async function atomic(path, value) { const output = resolve(path); await mkdir(dirname(output), { recursive: true }); const temporary = `${output}.${process.pid}.tmp`; try { await writeFile(temporary, JSON.stringify(value), { mode: 0o600 }); await rename(temporary, output); } catch (error) { await rm(temporary, { force: true }); throw error; } return output; }
try { const options = parse(process.argv.slice(2)); const config = await readConfig(options['--config']); const { report, acknowledgements } = await scanV5WithAcknowledgements({ host: config.host, collectionEnabled: config.collection.enabled, cwd: options['--cwd'] || process.cwd(), arch: arch(), platform: platform() }); validateReportV5(report); assertConfigIdentity(config, report); const output = await atomic(options['--output'], report); const acknowledgementOutput = options['--ack-output'] ? await atomic(options['--ack-output'], acknowledgements) : null; process.stdout.write(`${JSON.stringify({ ok: true, report_id: report.report_id, output, acknowledgement_output: acknowledgementOutput })}\n`); } catch (error) { process.stderr.write(`[factory-scan-v5] ${error?.message || '失敗'}\n`); process.exitCode = 1; }
