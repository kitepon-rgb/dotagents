import { scanV5WithAcknowledgements, V5_PRODUCT_IDS } from './v5.mjs';

// Observerは工場コア撤去後、wire必須キーからも外す。v6の現行集合はv5と同じ13製品。
export const V6_PRODUCT_IDS = Object.freeze([...V5_PRODUCT_IDS]);

export async function scanV6WithAcknowledgements(options) {
  const prior = await scanV5WithAcknowledgements(options);
  const products = Object.fromEntries(
    V6_PRODUCT_IDS.map((id) => [id, { ...prior.report.products[id], contract_version: '6.0' }]),
  );
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
