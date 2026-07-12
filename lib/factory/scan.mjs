import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './command.mjs';

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
  'codex-sidecar': 'codex-sidecar-mcp',
};
const OS_FOR_PROFILE = {
  mac: 'darwin',
  server: 'linux',
  wsl: 'linux',
  'windows-native': 'windows',
};
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

async function version(command, options) {
  const result = await run(command, ['--version'], options);
  if (!result.ok) return null;
  const match = result.stdout.trim().match(
    /(?:^|\s)v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)(?:\s|$)/,
  );
  return match?.[1] && match[1].length <= 128 ? match[1] : null;
}

async function thirdParty(productId, options) {
  const product = emptyProduct();
  const installedVersion = await version(CLI[productId], options);
  if (installedVersion) {
    product.presence_status = 'installed';
    product.installed_version = installedVersion;
  }

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

export async function scan({ host, cwd, arch, platform }) {
  const normalizedPlatform = platform === 'win32' ? 'windows' : platform;
  if (OS_FOR_PROFILE[host.profile] !== normalizedPlatform) {
    throw new Error('host.profileと実行platformが不一致です');
  }
  if (!['x64', 'arm64', 'arm', 'ia32'].includes(arch)) {
    throw new Error('実行archがreport schema対象外です');
  }

  const options = { cwd };
  const products = Object.fromEntries(PRODUCTS.map((id) => [id, emptyProduct()]));
  for (const id of ['codegraph', 'markitdown', 'oracle']) {
    products[id] = await thirdParty(id, options);
  }
  for (const id of ['caveat', 'throughline', 'spotter', 'aiterm-mcp', 'codex-sidecar']) {
    const installedVersion = await version(CLI[id], options);
    if (installedVersion) {
      products[id].presence_status = 'installed';
      products[id].installed_version = installedVersion;
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

  const observedAt = new Date().toISOString();
  return {
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
}
