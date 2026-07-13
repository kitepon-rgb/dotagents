import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './command.mjs';
import {
  acknowledgementBundle,
  collectRuntimeErrors,
  RUNTIME_ERROR_PRODUCTS,
} from './runtime-errors.mjs';

export const PRODUCTS = [
  'caveat', 'throughline', 'spotter', 'codegraph', 'markitdown',
  'oracle', 'aiterm-mcp', 'codex-sidecar', 'servermanager',
];

const CLI = {
  caveat: 'caveat',
  throughline: 'throughline',
  spotter: 'spotter',
  codegraph: 'codegraph',
  markitdown: 'markitdown',
  oracle: 'oracle',
  'aiterm-mcp': 'aiterm-mcp',
  'codex-sidecar': 'codex-sidecar',
};
const OS_FOR_PROFILE = {
  mac: 'darwin',
  server: 'linux',
  wsl: 'linux',
  'windows-native': 'windows',
};
const THIRD_PARTY_VERSION_RANGES = {
  codegraph: { major: 1, minor: 4 },
  markitdown: { major: 0, minor: 1 },
  oracle: { major: 0, minor: 16 },
};
const THIRD_PARTY_CHECK_IDS = {
  codegraph: 'index',
  markitdown: 'local_fixture',
  oracle: 'doctor',
};
const SEMVER = '(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-(?:0|[1-9]\\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\\.(?:0|[1-9]\\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?';
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

function emptyProduct() {
  return {
    presence_status: 'unverified',
    contract_version: '1.0',
    checks: [],
    runtime_errors: [],
    resolutions: [],
  };
}

function fixedFailureCheck(productId, reasonCode, observedAt) {
  const messageTemplate = `${productId} native diagnostics reported not ready`;
  return {
    check_id: 'native_diagnostics',
    status: 'fail',
    severity: 'high',
    fingerprint: createHash('sha256').update(`${productId}:${reasonCode}`).digest('hex'),
    message_template: messageTemplate,
    occurrence_count: 1,
    first_seen: observedAt,
    last_seen: observedAt,
    reason_code: reasonCode,
  };
}

function projectNativeStatus(product, productId, status, observedAt) {
  if (status === 'ready' || status === 'pass') {
    product.compatibility_status = 'compatible';
    product.checks.push({ check_id: 'native_diagnostics', status: 'pass' });
  } else if (status === 'not_ready' || status === 'fail') {
    product.compatibility_status = 'incompatible';
    product.checks.push(fixedFailureCheck(productId, 'native_not_ready', observedAt));
  } else if (status === 'not_applicable') {
    product.checks.push({
      check_id: 'native_diagnostics', status: 'skipped', reason_code: 'not_applicable',
    });
  } else {
    product.compatibility_status = 'unverified';
    product.checks.push({ check_id: 'native_diagnostics', status: 'unverified' });
  }
}

async function nativeCli(productId, command, args, options, observedAt) {
  const result = await run(command, args, options);
  let diagnostic;
  try { diagnostic = JSON.parse(result.stdout); } catch { diagnostic = null; }
  if (productId === 'codex-sidecar') {
    return codexSidecarNative(result, diagnostic, observedAt);
  }
  const product = emptyProduct();
  const valid = result.ok && diagnostic && typeof diagnostic === 'object' && !Array.isArray(diagnostic);
  if (!valid) {
    product.checks.push({
      check_id: 'native_diagnostics', status: 'unverified', reason_code: 'native_schema_invalid',
    });
    return product;
  }
  if (productId === 'throughline' &&
    diagnostic.schema === 'throughline.native_factory_diagnostics.v1' &&
    typeof diagnostic.version === 'string' && typeof diagnostic.overall?.status === 'string') {
    product.presence_status = 'installed';
    product.installed_version = diagnostic.version;
    if (typeof diagnostic.databaseSchema?.schema === 'string') {
      product.state_schema_version = diagnostic.databaseSchema.schema;
      product.migration_status = diagnostic.databaseSchema.status === 'ready'
        ? 'current'
        : diagnostic.databaseSchema.status === 'not_ready' ? 'failed' : 'unverified';
    }
    projectNativeStatus(product, productId, diagnostic.overall.status, observedAt);
    return product;
  }
  if (productId === 'spotter' && diagnostic.schema_version === '1.0' &&
    diagnostic.product === 'spotter' && typeof diagnostic.version === 'string' &&
    typeof diagnostic.overall_status === 'string') {
    product.presence_status = 'installed';
    product.installed_version = diagnostic.version;
    if (typeof diagnostic.marker_schema_version === 'string') {
      product.state_schema_version = diagnostic.marker_schema_version;
    }
    projectNativeStatus(product, productId, diagnostic.overall_status, observedAt);
    return product;
  }
  product.checks.push({
    check_id: 'native_diagnostics', status: 'unverified', reason_code: 'native_schema_invalid',
  });
  return product;
}

function codexSidecarNative(result, diagnostic, observedAt) {
  const product = emptyProduct();
  const readiness = diagnostic?.factoryReadiness;
  const validVersion = (value) => typeof value === 'string'
    && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);
  const invalid = () => {
    product.checks.push({
      check_id: 'native_diagnostics', status: 'unverified', reason_code: 'native_schema_invalid',
    });
    return product;
  };
  if (!diagnostic || typeof diagnostic !== 'object' || Array.isArray(diagnostic)
    || readiness?.schemaVersion !== '1'
    || !['ready', 'not_ready', 'unverified'].includes(readiness?.overall)
    || !['ok', 'failed'].includes(diagnostic.status)
    || result.ok !== (diagnostic.status === 'ok')
    || (readiness.overall === 'ready' && diagnostic.status !== 'ok')
    || (readiness.overall !== 'ready' && diagnostic.status !== 'failed')) {
    return invalid();
  }
  if (readiness.overall === 'unverified') {
    projectNativeStatus(product, 'codex-sidecar', 'unverified', observedAt);
    return product;
  }

  const packageVersions = readiness.packageVersions;
  const packages = packageVersions?.packages;
  if (!packageVersions || (packageVersions.status !== 'ready' && packageVersions.status !== 'not_ready')
    || !packages || typeof packages !== 'object' || Array.isArray(packages)
    || !validVersion(packages.cli) || !validVersion(packages.core) || !validVersion(packages.mcp)) {
    return invalid();
  }
  const versionsAligned = packages.cli === packages.core && packages.core === packages.mcp;
  if ((readiness.overall === 'ready' && (packageVersions.status !== 'ready' || !versionsAligned))
    || (!versionsAligned && packageVersions.status !== 'not_ready')) {
    return invalid();
  }
  if (versionsAligned) {
    product.presence_status = 'installed';
    product.installed_version = packages.cli;
  }
  projectNativeStatus(product, 'codex-sidecar', readiness.overall, observedAt);
  return product;
}

async function aitermNative(options, observedAt) {
  const messages = [
    {
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'dotagents-factory', version: '1.0.0' } },
    },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'diagnostics', arguments: {} } },
  ];
  const result = await run('aiterm-mcp', [], {
    ...options,
    input: `${messages.map((message) => JSON.stringify(message)).join('\n')}\n`,
  });
  let diagnostic;
  try {
    const response = result.stdout.trim().split('\n').map((line) => JSON.parse(line))
      .find((entry) => entry.id === 2);
    diagnostic = JSON.parse(response?.result?.content?.[0]?.text);
  } catch {
    diagnostic = null;
  }
  const product = emptyProduct();
  if (!result.ok || diagnostic?.diagnostic_schema !== 'aiterm-mcp.factory-diagnostics.v1' ||
    typeof diagnostic.version !== 'string' || typeof diagnostic.overall !== 'string') {
    product.checks.push({
      check_id: 'native_diagnostics', status: 'unverified', reason_code: 'native_schema_invalid',
    });
    return product;
  }
  product.presence_status = 'installed';
  product.installed_version = diagnostic.version;
  projectNativeStatus(product, 'aiterm-mcp', diagnostic.overall, observedAt);
  return product;
}

async function version(command, options) {
  const result = await run(command, ['--version'], options);
  if (!result.ok) return null;
  const match = result.stdout.trim().match(
    /(?:^|\s)v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)(?:\s|$)/,
  );
  return match?.[1] && match[1].length <= 128 ? match[1] : null;
}

function stableSemver(versionValue) {
  const match = versionValue?.match(
    new RegExp(`^${SEMVER}$`),
  );
  if (!match) return null;
  const prereleaseIndex = versionValue.indexOf('-');
  const buildIndex = versionValue.indexOf('+');
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    prerelease: prereleaseIndex !== -1 && (buildIndex === -1 || prereleaseIndex < buildIndex),
  };
}

async function thirdPartyVersion(productId, options) {
  const result = await run(CLI[productId], ['--version'], options);
  if (!result.ok) return null;
  const output = result.stdout.trim();
  const match = output.match(new RegExp(`^(?:${productId}[\\t ]+)?v?(${SEMVER})$`));
  return match?.[1] && match[1].length <= 128 ? match[1] : null;
}

function thirdPartyVersionCheck(productId, installedVersion) {
  const parsed = stableSemver(installedVersion);
  if (!parsed) {
    return { check_id: THIRD_PARTY_CHECK_IDS[productId], status: 'unverified', reason_code: 'version_unverified' };
  }
  const supported = THIRD_PARTY_VERSION_RANGES[productId];
  if (parsed.prerelease || parsed.major !== supported.major || parsed.minor !== supported.minor) {
    return { check_id: THIRD_PARTY_CHECK_IDS[productId], status: 'unsupported', reason_code: 'upstream_version_unsupported' };
  }
  return null;
}

async function thirdParty(productId, options) {
  const product = emptyProduct();
  const installedVersion = await thirdPartyVersion(productId, options);
  const versionCheck = thirdPartyVersionCheck(productId, installedVersion);
  if (versionCheck) {
    if (installedVersion && versionCheck.status === 'unsupported') {
      product.presence_status = 'installed';
      product.installed_version = installedVersion;
    }
    product.checks.push(versionCheck);
    return product;
  }
  product.presence_status = 'installed';
  product.installed_version = installedVersion;

  if (productId === 'codegraph') {
    const result = await run('codegraph', ['status', '--json'], options);
    let status;
    try { status = result.ok ? JSON.parse(result.stdout) : null; } catch { status = null; }
    if (status?.initialized === false) {
      product.checks.push({ check_id: 'index', status: 'skipped', reason_code: 'not_indexed' });
    } else if (status?.initialized === true) {
      product.checks.push({ check_id: 'index', status: 'pass' });
    } else {
      product.checks.push({ check_id: 'index', status: 'unverified' });
    }
  }

  if (productId === 'oracle') {
    const result = await run('oracle', ['doctor', '--providers', '--json'], options);
    let doctor;
    try { doctor = JSON.parse(result.stdout); } catch { doctor = null; }
    const machineReadable = doctor && typeof doctor === 'object' && !Array.isArray(doctor);
    product.checks.push(result.ok && machineReadable
      ? { check_id: 'doctor', status: 'pass' }
      : machineReadable
        ? { check_id: 'doctor', status: 'unverified', reason_code: 'provider_not_ready' }
        : { check_id: 'doctor', status: 'unverified' });
  }

  if (productId === 'markitdown') {
    const directory = await mkdtemp(join(tmpdir(), 'factory-markitdown-'));
    const fixture = join(directory, 'fixture.txt');
    try {
      await writeFile(fixture, 'factory fixture\n');
      const result = await run('markitdown', [fixture], options);
      product.checks.push({
        check_id: 'local_fixture',
        status: result.ok && Buffer.byteLength(result.stdout) > 0 ? 'pass' : 'unverified',
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
  return product;
}

async function scanResult({ host, cwd, arch, platform, collectionEnabled = false }) {
  const normalizedPlatform = platform === 'win32' ? 'windows' : platform;
  if (OS_FOR_PROFILE[host.profile] !== normalizedPlatform) {
    throw new Error('host.profileと実行platformが不一致です');
  }
  if (!['x64', 'arm64', 'arm', 'ia32'].includes(arch)) {
    throw new Error('実行archがreport schema対象外です');
  }

  const observedAt = new Date().toISOString();
  const options = { cwd };
  const products = Object.fromEntries(PRODUCTS.map((id) => [id, emptyProduct()]));
  for (const id of ['codegraph', 'markitdown', 'oracle']) {
    products[id] = await thirdParty(id, options);
  }
  for (const id of ['caveat']) {
    const installedVersion = await version(CLI[id], options);
    if (installedVersion) {
      products[id].presence_status = 'installed';
      products[id].installed_version = installedVersion;
    }
  }
  products.throughline = await nativeCli(
    'throughline', 'throughline', ['factory-diagnostics', '--json'], options, observedAt,
  );
  products.spotter = await nativeCli(
    'spotter', 'spotter', ['diagnostics', 'factory'], options, observedAt,
  );
  products['codex-sidecar'] = await nativeCli(
    'codex-sidecar', 'codex-sidecar', ['factory-diagnostics', '--project', cwd], options, observedAt,
  );
  products['aiterm-mcp'] = await aitermNative(options, observedAt);
  const acknowledgements = [];
  if (collectionEnabled) {
    for (const id of RUNTIME_ERROR_PRODUCTS) {
      const projection = await collectRuntimeErrors(id, options);
      products[id].runtime_errors = projection.runtime_errors;
      products[id].resolutions = projection.resolutions;
      if (projection.acknowledgement) acknowledgements.push(projection.acknowledgement);
    }
  }
  products.servermanager = host.profile === 'server'
    ? emptyProduct()
    : { ...emptyProduct(), presence_status: 'not_applicable' };

  const revision = await run('git', ['rev-parse', '--short=7', 'HEAD'], {
    cwd: REPO_ROOT,
    env: process.env,
  });
  const dotagentsRevision = revision.stdout.trim();
  if (!revision.ok || !/^[0-9a-f]{7,64}$/.test(dotagentsRevision)) {
    throw new Error('dotagents revisionを取得できません');
  }

  const report = {
    schema_version: '1.0',
    report_id: randomUUID(),
    host_id: host.id,
    host_profile: host.profile,
    platform: { os: normalizedPlatform, arch },
    report_mode: 'full',
    observed_at: observedAt,
    created_at: new Date().toISOString(),
    reporter: { version: '1.0.0', dotagents_revision: dotagentsRevision },
    products,
  };
  return { report, acknowledgements: acknowledgementBundle(report.report_id, acknowledgements) };
}

export async function scan(options) {
  return (await scanResult(options)).report;
}

export async function scanWithAcknowledgements(options) {
  return scanResult(options);
}
