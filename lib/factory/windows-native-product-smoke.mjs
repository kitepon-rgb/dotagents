import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { CURRENT_WIRE_PRODUCT_IDS, postUpdateFailures } from './deployment-contract.mjs';

const CORE_CHECKS = Object.freeze({
  caveat: ['native_diagnostics'],
  throughline: ['database_schema', 'codex_hooks', 'restore'],
  spotter: ['project_activation', 'marker_schema', 'throughline_context', 'claude_catalog', 'codex_catalog', 'audit_catalog_readiness'],
  lattice: ['native_diagnostics'],
  markitdown: ['local_fixture'],
  'gpt-connector': ['version', 'state_schema', 'job_schema', 'mcp_contract'],
  'aiterm-mcp': ['mcp', 'runtime_error_store'],
  'codex-sidecar': ['native_diagnostics'],
  peertable: ['version_consistency', 'bin_integrity', 'node_runtime', 'skill_bundle'],
});

const TOOLCHAIN_CHECKS = Object.freeze({
  'claude-code': ['installed_version', 'required_hooks', 'last_update'],
  'codex-cli': ['installed_version', 'config_parser', 'native_routing', 'required_hooks', 'last_update'],
  'grok-build': ['stable_update', 'last_update'],
});

function record(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is not an object`);
  return value;
}

function pass(product, id, checkId) {
  const item = Array.isArray(product.checks) ? product.checks.find((candidate) => candidate?.check_id === checkId) : null;
  if (!item || item.status !== 'pass') throw new Error(`${id}:${checkId} is not pass`);
}

function structural(product, id, checkId) {
  if (product.presence_status !== 'not_applicable' || product.compatibility_status !== 'unsupported') {
    throw new Error(`${id} does not match the Windows structural state`);
  }
  const item = Array.isArray(product.checks) ? product.checks.find((candidate) => candidate?.check_id === checkId) : null;
  if (!item || item.status !== 'unsupported' || item.reason_code !== 'platform_unsupported') {
    throw new Error(`${id}:${checkId} does not prove platform unsupported`);
  }
}

function retired(product, id) {
  if (product.presence_status !== 'not_applicable' || product.compatibility_status !== 'unsupported') {
    throw new Error(`${id} does not match the retired wire state`);
  }
  const item = Array.isArray(product.checks) ? product.checks.find((candidate) => candidate?.check_id === 'factory_core') : null;
  if (!item || item.status !== 'unsupported' || item.reason_code !== 'retired_from_factory_core') {
    throw new Error(`${id}:factory_core does not prove factory-core retirement`);
  }
}

export function assertWindowsNativeProductSmoke(report, runtimeArch = process.arch) {
  record(report, 'report');
  if (report.schema_version !== '7.0' || report.host_profile !== 'windows-native') throw new Error('report is not Windows native wire v7');
  if (!report.platform || report.platform.os !== 'windows' || report.platform.arch !== runtimeArch) throw new Error('report platform does not match this Windows runtime');
  const products = record(report.products, 'products');
  const expected = [...CURRENT_WIRE_PRODUCT_IDS].sort();
  const actual = Object.keys(products).sort();
  if (actual.length !== expected.length || actual.some((id, index) => id !== expected[index])) throw new Error('wire v7 product set is incomplete or contains unknown products');

  const failures = postUpdateFailures(report, { profile: 'windows-native', os: 'win32', arch: runtimeArch });
  if (failures.length > 0) throw new Error(`Windows required product gate failed: ${failures.join(',')}`);

  for (const [id, checks] of Object.entries(CORE_CHECKS)) {
    const product = record(products[id], id);
    if (product.presence_status !== 'installed' || !product.installed_version) throw new Error(`${id} is not installed with a version`);
    for (const checkId of checks) pass(product, id, checkId);
  }
  for (const [id, checks] of Object.entries(TOOLCHAIN_CHECKS)) {
    const product = record(products[id], id);
    if (product.presence_status !== 'installed' || !product.installed_version) throw new Error(`${id} toolchain is not installed with a version`);
    for (const checkId of checks) pass(product, id, checkId);
  }
  structural(record(products.aishell, 'aishell'), 'aishell', 'native_diagnostics');
  retired(record(products.observer, 'observer'), 'observer');
  if (products.servermanager?.presence_status !== 'not_applicable' || (products.servermanager.checks?.length ?? -1) !== 0) {
    throw new Error('servermanager does not match the Windows not_applicable state');
  }

  return Object.freeze({
    schema: 'dotagents.windows-native-product-smoke.v1',
    status: 'passed',
    checked_products: expected.length,
    operational_products: Object.freeze([...Object.keys(CORE_CHECKS), ...Object.keys(TOOLCHAIN_CHECKS)]),
    structural_products: Object.freeze(['aishell', 'observer', 'servermanager']),
  });
}

async function main() {
  if (process.platform !== 'win32') throw new Error('windows-native-product-smoke is Windows-native only');
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--report' || !args[1]) throw new Error('usage: windows-native-product-smoke --report <latest-report.json>');
  const report = JSON.parse(await readFile(args[1], 'utf8'));
  process.stdout.write(`${JSON.stringify(assertWindowsNativeProductSmoke(report))}\n`);
}

if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`[windows-native-product-smoke] ${error.message}\n`);
    process.exitCode = 1;
  });
}
