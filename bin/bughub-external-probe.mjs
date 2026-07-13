#!/usr/bin/env node
import process from 'node:process';

const DEFAULT_URL = 'http://127.0.0.1:39310/readyz';
const TIMEOUT_MS = 5_000;
const MAX_BODY_BYTES = 64 * 1024;
const CHECK_IDS = ['database', 'schema', 'pull_poll', 'factory_ingest', 'factory_delivery'];
const STATUSES = new Set(['pass', 'fail', 'skipped']);
const REASON = /^[a-z][a-z0-9_]{0,63}$/;
const REASONS = new Set([
  'ready', 'database_unavailable', 'query_failed', 'version_mismatch', 'not_observed',
  'timestamp_invalid', 'source_status_invalid', 'source_failed', 'delivery_failed',
  'poll_failed', 'stale', 'disabled', 'not_configured', 'factory_state_unavailable',
  'state_invalid', 'delivered', 'not_needed',
]);
const UTF8 = new TextDecoder('utf-8', { fatal: true });

function exact(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && Object.keys(value).every((key) => keys.includes(key));
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

function project(value, responseStatus) {
  if (!exact(value, ['schema_version', 'product_version', 'status', 'checks'])
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
  return {
    schema_version: 'dotagents.bughub-external-probe.v1',
    product_version: value.product_version,
    status: value.status,
    reason_code: value.status === 'ready' ? 'ready' : 'readiness_failed',
    checks,
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
    return { schema_version: 'dotagents.bughub-external-probe.v1', product_version: null, status: 'unverified', reason_code: 'unreachable', checks: [] };
  }
  try {
    return project(JSON.parse(await boundedBody(response)), response.status);
  } catch {
    return { schema_version: 'dotagents.bughub-external-probe.v1', product_version: null, status: 'unverified', reason_code: 'contract_invalid', checks: [] };
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
