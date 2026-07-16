import assert from "node:assert/strict";
import { test } from "node:test";

import { CONSULTATION_CONNECTORS_V26 } from "../../lib/orchestrate/control-record.mjs";
import { defaultAdapterCatalog } from "../../lib/orchestrate/executor-adapters.mjs";
import {
  CONSULTATION_CONNECTOR_FAMILIES, OBSERVER_EXCLUDED_LANES, PlacementPolicyError,
  ROLE_PROVIDER_PLACEMENT, consultationPlacement, observerPlacement,
} from "../../lib/orchestrate/placement-policy.mjs";

const code = (expected) => (error) => {
  assert.ok(error instanceof PlacementPolicyError); assert.equal(error.code, expected); return true;
};

test("role別の配置関係はobserver同社・相談役異社第一候補・worker適応配置を固定する", () => {
  assert.deepEqual(ROLE_PROVIDER_PLACEMENT, {
    observer: "same-provider-family",
    consultant: "cross-provider-first",
    worker: "eligibility-adaptive",
  });
});

test("相談役の適格provider集合は親familyごとにcross/sameへ分類され、異社が第一候補群になる", () => {
  assert.deepEqual(consultationPlacement("openai"), {
    schema_version: "dotagents.placement-policy.v1", parent_provider_family: "openai",
    cross_provider: ["claude-native"], same_provider: ["codex-sidecar", "gpt-connector"],
    relation: "cross-provider-first",
  });
  assert.deepEqual(consultationPlacement("anthropic"), {
    schema_version: "dotagents.placement-policy.v1", parent_provider_family: "anthropic",
    cross_provider: ["codex-sidecar", "gpt-connector"], same_provider: ["claude-native"],
    relation: "cross-provider-first",
  });
  // 分類であって強制拒否ではない: 同familyのconnectorも空にならず利用可能なまま返る
  assert.ok(consultationPlacement("openai").same_provider.includes("gpt-connector"));
  assert.throws(() => consultationPlacement("xai"), code("PROVIDER_FAMILY_UNKNOWN"));
  assert.throws(() => consultationPlacement(undefined), code("PROVIDER_FAMILY_UNKNOWN"));
});

test("Observerは親と同familyに置かれWorker票・Consultation票のlaneから除外される", () => {
  for (const family of ["anthropic", "openai"]) {
    const placement = observerPlacement(family);
    assert.equal(placement.observer_provider_family, family);
    assert.deepEqual(placement.excluded_lanes, ["worker", "consultation"]);
  }
  assert.deepEqual(OBSERVER_EXCLUDED_LANES, ["worker", "consultation"]);
  assert.throws(() => observerPlacement("chatgpt"), code("PROVIDER_FAMILY_UNKNOWN"));
  // adapter catalogにobserver laneは存在しない（Observerはexecutor adapterではない）
  assert.deepEqual([...new Set(defaultAdapterCatalog().map((entry) => entry.lane))].sort(), ["consultation", "host-projection", "worker"]);
});

test("policyのconnector集合はControl v26 connector enumとcatalogのconsultation laneに一致する", () => {
  const policyConnectors = Object.keys(CONSULTATION_CONNECTOR_FAMILIES).sort();
  assert.deepEqual(policyConnectors, [...CONSULTATION_CONNECTORS_V26].sort());
  const catalogConsultationAdapters = [...new Set(defaultAdapterCatalog().filter((entry) => entry.lane === "consultation").map((entry) => entry.adapter_id))].sort();
  assert.deepEqual(policyConnectors, catalogConsultationAdapters);
});
