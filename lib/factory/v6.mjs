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

// 履歴キー専用。presenceのnot_applicableをcompatibility/checkへ流用しない。
export async function observerProduct() {
  return {
    ...empty(),
    presence_status: 'not_applicable',
    compatibility_status: 'unsupported',
    checks: [check('factory_core', 'unsupported', 'retired_from_factory_core')],
  };
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
