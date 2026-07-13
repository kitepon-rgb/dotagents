#!/usr/bin/env node
import process from 'node:process';
import { open } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_URL = 'http://127.0.0.1:39310/readyz';
const TIMEOUT_MS = 5_000;
const MAX_BODY_BYTES = 64 * 1024;
const CHECK_IDS = ['database', 'schema', 'pull_poll', 'factory_ingest', 'factory_delivery', 'source_revision'];
const STATUSES = new Set(['pass', 'fail', 'skipped']);
const REASON = /^[a-z][a-z0-9_]{0,63}$/;
const REASONS = new Set([
  'ready', 'database_unavailable', 'query_failed', 'version_mismatch', 'not_observed',
  'timestamp_invalid', 'source_status_invalid', 'source_failed', 'delivery_failed',
  'poll_failed', 'stale', 'disabled', 'not_configured', 'factory_state_unavailable',
  'state_invalid', 'delivered', 'not_needed',
  'revision_match', 'revision_missing', 'revision_invalid', 'revision_mismatch',
]);
const UTF8 = new TextDecoder('utf-8', { fatal: true });
const REVISION = /^[0-9a-f]{40,64}$/;
const MAX_REVISION_BYTES = 65;

function exact(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && Object.keys(value).every((key) => keys.includes(key));
}

async function expectedRevision() {
  const path = process.env.BUGHUB_DEPLOY_REVISION_FILE
    || (process.env.HOME ? join(process.env.HOME, 'bughub', 'data', 'deploy-source-revision') : null);
  if (!path) return { reason_code: 'revision_missing', value: null };
  let handle;
  try {
    handle = await open(path, 'r');
    const buffer = Buffer.alloc(MAX_REVISION_BYTES + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > MAX_REVISION_BYTES) return { reason_code: 'revision_invalid', value: null };
    const text = UTF8.decode(buffer.subarray(0, bytesRead));
    const match = /^([0-9a-f]{40,64})\n?$/.exec(text);
    return match ? { reason_code: 'ready', value: match[1] } : { reason_code: 'revision_invalid', value: null };
  } catch (error) {
    return { reason_code: error?.code === 'ENOENT' ? 'revision_missing' : 'revision_invalid', value: null };
  } finally {
    await handle?.close();
  }
}

function endpoint() {
  const url = new URL(process.env.BUGHUB_READINESS_URL || DEFAULT_URL);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/readyz'
    || url.username || url.password || url.search || url.hash
    || (url.port && (!/^\d+$/.test(url.port) || Number(url.port) < 1 || Number(url.port) > 65535))) {
    throw new Error('endpoint_invalid');
  }
  return url;
}

async function boundedBody(response) {
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('body_too_large');
    chunks.push(chunk);
  }
  return UTF8.decode(Buffer.concat(chunks));
}

function project(value, responseStatus, expected) {
  if (!exact(value, ['schema_version', 'product_version', 'status', 'checks', 'source_revision'])
    || value.schema_version !== 'bughub.readiness.v1'
    || typeof value.product_version !== 'string'
    || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value.product_version)
    || !['ready', 'not_ready'].includes(value.status)
    || (value.status === 'ready' ? responseStatus !== 200 : responseStatus !== 503)
    || !Array.isArray(value.checks) || value.checks.length !== CHECK_IDS.length) throw new Error('contract_invalid');
  const checks = value.checks.map((item, index) => {
    if (!exact(item, ['id', 'status', 'reason_code', 'observed_at', 'age_ms', 'affected_count'])
      || item.id !== CHECK_IDS[index] || !STATUSES.has(item.status)
      || typeof item.reason_code !== 'string' || !REASON.test(item.reason_code)
      || !REASONS.has(item.reason_code)) throw new Error('contract_invalid');
    return { id: item.id, status: item.status, reason_code: item.reason_code };
  });
  if ((value.status === 'ready') !== checks.every((item) => item.status !== 'fail')) throw new Error('contract_invalid');
  const sourceCheck = checks.at(-1);
  const sourceState = typeof value.source_revision === 'string' && REVISION.test(value.source_revision)
    ? 'ready'
    : value.source_revision == null ? 'revision_missing' : 'revision_invalid';
  const endpointRevisionValid = (sourceState === 'ready'
    && ((sourceCheck.status === 'pass' && sourceCheck.reason_code === 'revision_match')
      || (sourceCheck.status === 'fail'
        && ['revision_missing', 'revision_invalid', 'revision_mismatch'].includes(sourceCheck.reason_code))))
    || (sourceState !== 'ready' && sourceCheck.status === 'fail' && sourceCheck.reason_code === sourceState);
  if (!endpointRevisionValid) throw new Error('contract_invalid');
  let revisionReason;
  if (sourceState !== 'ready') {
    revisionReason = sourceState;
  } else if (['revision_missing', 'revision_invalid'].includes(sourceCheck.reason_code)) {
    if (expected.reason_code !== sourceCheck.reason_code) throw new Error('contract_invalid');
    revisionReason = sourceCheck.reason_code;
  } else if (sourceCheck.reason_code === 'revision_mismatch') {
    if (expected.reason_code !== 'ready' || value.source_revision === expected.value) throw new Error('contract_invalid');
    revisionReason = 'revision_mismatch';
  } else {
    if (expected.reason_code === 'ready' && value.source_revision !== expected.value) throw new Error('contract_invalid');
    revisionReason = expected.reason_code === 'ready' ? 'revision_match' : expected.reason_code;
  }
  const projectedChecks = [...checks.slice(0, -1), {
    id: 'source_revision', status: revisionReason === 'revision_match' ? 'pass' : 'fail', reason_code: revisionReason,
  }];
  const status = projectedChecks.some((item) => item.status === 'fail') ? 'not_ready' : 'ready';
  return {
    schema_version: 'dotagents.bughub-external-probe.v1',
    product_version: value.product_version,
    status,
    reason_code: status === 'ready' ? 'ready' : 'readiness_failed',
    source_revision: sourceState === 'ready' ? value.source_revision : null,
    checks: projectedChecks,
  };
}

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== '--json') throw new Error('arguments_invalid');
  let url;
  try { url = endpoint(); } catch { throw new Error('endpoint_invalid'); }
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'error' });
  } catch {
    return { schema_version: 'dotagents.bughub-external-probe.v1', product_version: null, status: 'unverified', reason_code: 'unreachable', source_revision: null, checks: [] };
  }
  try {
    return project(JSON.parse(await boundedBody(response)), response.status, await expectedRevision());
  } catch {
    return { schema_version: 'dotagents.bughub-external-probe.v1', product_version: null, status: 'unverified', reason_code: 'contract_invalid', source_revision: null, checks: [] };
  }
}

try {
  const result = await main();
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (result.status !== 'ready') process.exitCode = 1;
} catch (error) {
  process.stderr.write(`[bughub-external-probe] ${error?.message || 'failed'}\n`);
  process.exitCode = 2;
}
