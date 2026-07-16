// Provider-relation placement policy (shared/orchestrate/contract.md「知能の配置原則」).
// This module fixes RELATIONS to the parent provider only. Role→model resolution lives in
// docs/02_models.md exclusively; no model names may appear here (ADR 0045 §2, PLAN 原則9).

export const PLACEMENT_POLICY_SCHEMA = "dotagents.placement-policy.v1";

const PROVIDER_FAMILIES = Object.freeze(["anthropic", "openai"]);

// observer: same family as the parent, never a Worker or Consultation vote (ADR 0043-5).
// consultant: cross-family is the FIRST CHOICE, not a hard rejection — same-family
//   connectors (e.g. ChatGPT consulted from a Codex parent) stay usable.
// worker: eligibility-filtered adaptive placement; rate-aware selection arrives with O4 (v27).
export const ROLE_PROVIDER_PLACEMENT = Object.freeze({
  observer: "same-provider-family",
  consultant: "cross-provider-first",
  worker: "eligibility-adaptive",
});

export const OBSERVER_EXCLUDED_LANES = Object.freeze(["worker", "consultation"]);

// Consultation connector → provider family. Keys must stay equal to the v26 connector
// closed enum (control-record) and to the consultation-lane adapters in the default catalog.
export const CONSULTATION_CONNECTOR_FAMILIES = Object.freeze({
  "gpt-connector": "openai",
  "claude-native": "anthropic",
  "codex-sidecar": "openai",
});

export class PlacementPolicyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PlacementPolicyError";
    this.code = code;
  }
}

const fail = (code, message) => { throw new PlacementPolicyError(code, message); };

export function consultationPlacement(parentProviderFamily) {
  if (!PROVIDER_FAMILIES.includes(parentProviderFamily)) fail("PROVIDER_FAMILY_UNKNOWN", "parent provider family is not a known placement family");
  const entries = Object.entries(CONSULTATION_CONNECTOR_FAMILIES);
  return {
    schema_version: PLACEMENT_POLICY_SCHEMA,
    parent_provider_family: parentProviderFamily,
    cross_provider: entries.filter(([, family]) => family !== parentProviderFamily).map(([connector]) => connector).sort(),
    same_provider: entries.filter(([, family]) => family === parentProviderFamily).map(([connector]) => connector).sort(),
    relation: ROLE_PROVIDER_PLACEMENT.consultant,
  };
}

export function observerPlacement(parentProviderFamily) {
  if (!PROVIDER_FAMILIES.includes(parentProviderFamily)) fail("PROVIDER_FAMILY_UNKNOWN", "parent provider family is not a known placement family");
  return {
    schema_version: PLACEMENT_POLICY_SCHEMA,
    parent_provider_family: parentProviderFamily,
    observer_provider_family: parentProviderFamily,
    excluded_lanes: [...OBSERVER_EXCLUDED_LANES],
    relation: ROLE_PROVIDER_PLACEMENT.observer,
  };
}
