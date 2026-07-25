import { run } from './command.mjs';
import { scanV5WithAcknowledgements, V5_PRODUCT_IDS } from './v5.mjs';

export const V6_PRODUCT_IDS = Object.freeze([...V5_PRODUCT_IDS, 'observer']);

function empty() {
  return {
    presence_status: 'unverified',
    contract_version: '6.0',
    checks: [],
    runtime_errors: [],
    resolutions: [],
  };
}

function check(check_id, status, reason_code) {
  return { check_id, status, ...(reason_code ? { reason_code } : {}) };
}

function exact(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && Object.keys(value).every((key) => keys.includes(key));
}

function semver(value) {
  return typeof value === 'string'
    && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u.test(value);
}

function observerDiagnostic(value) {
  if (!exact(value, ['schema', 'status', 'manifest', 'checks'])
    || value.schema !== 'observer.product_diagnostics.v1'
    || value.status !== 'ready'
    || !exact(value.manifest, ['schema', 'name', 'version', 'supported_platforms', 'state', 'bins', 'dependencies', 'diagnostics'])
    || value.manifest.schema !== 'observer.product_manifest.v1'
    || value.manifest.name !== 'observer'
    || !semver(value.manifest.version)
    || JSON.stringify(value.manifest.supported_platforms) !== JSON.stringify(['darwin'])
    || !Array.isArray(value.checks)
    || JSON.stringify(value.checks) !== JSON.stringify([
      { name: 'package_manifest', status: 'ok' },
      { name: 'instruction_files', status: 'ok' },
      { name: 'bin_integrity', status: 'ok' },
      { name: 'node_runtime', status: 'ok' },
      { name: 'platform', status: 'ok' },
    ])) {
    throw new Error('observer_diagnostics_schema');
  }
  return value.manifest.version;
}

async function observerProduct({ cwd, platform }) {
  if (platform !== 'darwin') {
    return {
      ...empty(),
      presence_status: 'not_applicable',
      compatibility_status: 'unsupported',
      checks: [check('platform', 'unsupported', 'platform_unsupported')],
    };
  }
  const result = await run('observer', ['diagnostics'], { cwd });
  let value;
  try {
    value = JSON.parse(result.stdout);
    if (!result.ok) throw new Error('observer_diagnostics_exit');
    const installed_version = observerDiagnostic(value);
    return {
      ...empty(),
      presence_status: 'installed',
      installed_version,
      compatibility_status: 'compatible',
      checks: value.checks.map((item) => check(item.name, 'pass')),
    };
  } catch {
    return {
      ...empty(),
      presence_status: result.reason === 'spawn' && result.error?.code === 'ENOENT' ? 'missing' : 'unverified',
      compatibility_status: 'unverified',
      checks: [check('native_diagnostics', 'unverified', 'native_schema_invalid')],
    };
  }
}

export async function scanV6WithAcknowledgements(options) {
  const prior = await scanV5WithAcknowledgements(options);
  const products = Object.fromEntries(
    V5_PRODUCT_IDS.map((id) => [id, { ...prior.report.products[id], contract_version: '6.0' }]),
  );
  products.observer = await observerProduct(options);
  const report = {
    ...prior.report,
    schema_version: '6.0',
    reporter: { ...prior.report.reporter, version: '6.0.0' },
    products,
  };
  return {
    report,
    acknowledgements: {
      ...prior.acknowledgements,
      schema_version: '6.0',
    },
  };
}

export async function scanV6(options) {
  return (await scanV6WithAcknowledgements(options)).report;
}
