import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_SELECTOR_POLICY, RateSelectorError, selectQuotaPool } from "../../lib/orchestrate/rate-selector.mjs";
import { makeQuotaExecutor as makeExecutor, makeQuotaSnapshot as makeSnapshot, makeQuotaWindow as makeWindow } from "./helpers.mjs";

const code = (expected) => (error) => {
  assert.ok(error instanceof RateSelectorError, `RateSelectorError expected, got ${error?.constructor?.name}`);
  assert.equal(error.code, expected);
  return true;
};

const NOW = "2026-07-17T01:00:00.000Z";
const openaiExecutor = makeExecutor();
const anthropicExecutor = makeExecutor({ adapter_id: "claude-native", handle_schema_id: "claude-native.session.v1" });

// makeSnapshotの既定: observed 00:00Z・5h窓（reset 04:00Z）・remaining 7000bp。
// NOW=01:00Zでは残り時間3h/5h=0.6、pace=0.7/0.6≈1.1667。
const openaiPool = (overrides = {}) => makeSnapshot(overrides);
const anthropicPool = (overrides = {}) => makeSnapshot({
  quota_pool_id: "anthropic-sub-main", provider: "anthropic", executor_scope: [anthropicExecutor], ...overrides,
});

const makeInput = (overrides = {}) => ({
  now: NOW, role: "worker", target_model_family: "mid-tier",
  candidates: [openaiExecutor, anthropicExecutor],
  snapshots: [openaiPool(), anthropicPool()],
  previous_selection: null,
  reservation: { wall_time_seconds: 3600, cost_microusd: 1000000 },
  // fixtureの時間軸（観測00:00Z・評価01:00Z）に合わせて鮮度だけ広げる。既定値900sはstale fixtureが固定する
  policy: { ...DEFAULT_SELECTOR_POLICY, max_snapshot_age_seconds: 7200 },
  ...overrides,
});

test("selectorは残headroom最大のpoolと決定的executorを選びevidence digestを残す", () => {
  // anthropic側の残量を厚くして最大headroomにする
  const input = makeInput({ snapshots: [openaiPool(), anthropicPool({ windows: [makeWindow({ remaining_bp: 9500 })] })] });
  const decision = selectQuotaPool(input);
  assert.equal(decision.schema_version, "dotagents.selector-decision.v1");
  assert.equal(decision.selected_quota_pool_id, "anthropic-sub-main");
  assert.deepEqual(decision.selected_executor, anthropicExecutor);
  assert.equal(decision.reason, "max-headroom");
  assert.equal(decision.evaluated_at, NOW);
  assert.deepEqual(decision.reservation, { wall_time_seconds: 3600, cost_microusd: 1000000 });
  assert.equal(decision.pool_evaluations.length, 2);
  for (const evaluation of decision.pool_evaluations) {
    assert.equal(evaluation.eligible, true);
    assert.ok(Number.isSafeInteger(evaluation.min_pace_bp));
  }
  assert.equal(decision.snapshot_evidence.length, 2);
  for (const evidence of decision.snapshot_evidence) {
    assert.equal(evidence.type, "executor-receipt");
    assert.match(evidence.digest, /^[a-f0-9]{64}$/);
  }
});

test("hysteresisは閾値以内の優位で前回poolを保持し、突破と前回不在/失格では働かない", () => {
  // openai pace≈1.1667、anthropic remaining 8000bp → pace≈1.3333（比≈1.143 < 1.25閾値）
  const snapshots = [openaiPool(), anthropicPool({ windows: [makeWindow({ remaining_bp: 8000 })] })];
  const held = selectQuotaPool(makeInput({ snapshots, previous_selection: { quota_pool_id: "openai-sub-main" } }));
  assert.equal(held.selected_quota_pool_id, "openai-sub-main");
  assert.equal(held.reason, "hysteresis-hold");
  // 閾値突破: anthropic remaining 9800bp → pace≈1.633（比1.4 > 1.25）
  const switched = selectQuotaPool(makeInput({
    snapshots: [openaiPool(), anthropicPool({ windows: [makeWindow({ remaining_bp: 9800 })] })],
    previous_selection: { quota_pool_id: "openai-sub-main" },
  }));
  assert.equal(switched.selected_quota_pool_id, "anthropic-sub-main");
  assert.equal(switched.reason, "max-headroom");
  // 前回poolがcandidates/snapshotsに居ない → 不適用
  const previousGone = selectQuotaPool(makeInput({ snapshots, previous_selection: { quota_pool_id: "retired-pool" } }));
  assert.equal(previousGone.reason, "max-headroom");
  // 前回poolがremaining-floor失格 → 不適用（かつ選ばれない）
  const previousIneligible = selectQuotaPool(makeInput({
    snapshots: [openaiPool({ windows: [makeWindow({ remaining_bp: 100 })] }), anthropicPool({ windows: [makeWindow({ remaining_bp: 8000 })] })],
    previous_selection: { quota_pool_id: "openai-sub-main" },
  }));
  assert.equal(previousIneligible.selected_quota_pool_id, "anthropic-sub-main");
  assert.equal(previousIneligible.reason, "only-eligible");
});

test("決定的tie-break: 量子化同率はquota_pool_id辞書順で安定に決まる", () => {
  const snapshots = [openaiPool(), anthropicPool()];
  const first = selectQuotaPool(makeInput({ snapshots }));
  const second = selectQuotaPool(makeInput({ snapshots: [anthropicPool(), openaiPool()] }));
  assert.equal(first.selected_quota_pool_id, "anthropic-sub-main");
  assert.equal(second.selected_quota_pool_id, "anthropic-sub-main");
  assert.deepEqual(first.pool_evaluations, second.pool_evaluations);
});

test("残量下限とpace飽和: reset直前の残量僅少poolは膨張paceで選ばれない", () => {
  // openai: reset直前（残り90秒/5h）remaining 150bp → 下限200bp未満で失格（飽和以前に除外）
  const nearReset = openaiPool({ windows: [makeWindow({ reset_at: "2026-07-17T01:01:30.000Z", remaining_bp: 150 })] });
  const decision = selectQuotaPool(makeInput({ snapshots: [nearReset, anthropicPool()] }));
  assert.equal(decision.selected_quota_pool_id, "anthropic-sub-main");
  assert.equal(decision.reason, "only-eligible");
  const excluded = decision.pool_evaluations.find((entry) => entry.quota_pool_id === "openai-sub-main");
  assert.deepEqual(excluded, { quota_pool_id: "openai-sub-main", min_pace_bp: null, binding_window_id: null, eligible: false, exclusion_reason: "remaining-floor" });
  // pace飽和: 残量は十分だがreset直前 → pace_cap_bpで飽和した整数がmin_pace_bpに入る
  const saturated = selectQuotaPool(makeInput({
    snapshots: [openaiPool({ windows: [makeWindow({ reset_at: "2026-07-17T01:01:30.000Z", remaining_bp: 7000 })] }), anthropicPool()],
  }));
  const saturatedEvaluation = saturated.pool_evaluations.find((entry) => entry.quota_pool_id === "openai-sub-main");
  assert.equal(saturatedEvaluation.min_pace_bp, DEFAULT_SELECTOR_POLICY.pace_cap_bp);
});

test("model_family_scope選別: 対象modelに適用されるwindowだけがpoolを縛る", () => {
  // anthropic: account全体5h＋opus専用weekly（残量枯渇）。mid-tier配置ではopus枠を無視する
  const anthropic = anthropicPool({
    windows: [
      makeWindow(),
      { window_id: "weekly-opus", starts_at: "2026-07-14T00:00:00.000Z", reset_at: "2026-07-21T00:00:00.000Z", remaining_bp: 10, model_family_scope: "opus" },
    ],
  });
  const midTier = selectQuotaPool(makeInput({ snapshots: [openaiPool({ windows: [makeWindow({ remaining_bp: 3000 })] }), anthropic] }));
  assert.equal(midTier.selected_quota_pool_id, "anthropic-sub-main");
  // opus配置ではopus枠が適用され、下限未満で失格する
  const opusPlacement = selectQuotaPool(makeInput({
    target_model_family: "opus",
    snapshots: [openaiPool({ windows: [makeWindow({ remaining_bp: 3000 })] }), anthropic],
  }));
  assert.equal(opusPlacement.selected_quota_pool_id, "openai-sub-main");
  const anthropicEvaluation = opusPlacement.pool_evaluations.find((entry) => entry.quota_pool_id === "anthropic-sub-main");
  assert.equal(anthropicEvaluation.exclusion_reason, "remaining-floor");
  // 適用windowゼロのpoolはno-applicable-windowで失格
  const scopedOnly = anthropicPool({ windows: [{ ...makeWindow({ window_id: "opus-only", remaining_bp: 9000 }), model_family_scope: "opus" }] });
  const noApplicable = selectQuotaPool(makeInput({ snapshots: [openaiPool(), scopedOnly] }));
  assert.equal(noApplicable.pool_evaluations.find((entry) => entry.quota_pool_id === "anthropic-sub-main").exclusion_reason, "no-applicable-window");
});

test("typed errorは固定検査順で決定的に発火する", () => {
  // INVALID_SCHEMA が WINDOW_CONTRADICTION より先（snapshot shape違反＋window矛盾の複合入力）
  assert.throws(() => selectQuotaPool(makeInput({
    snapshots: [openaiPool({ source: "guess", windows: [makeWindow({ duration_seconds: 60 })] }), anthropicPool()],
  })), code("INVALID_SCHEMA"));
  // WINDOW_CONTRADICTION が SNAPSHOT_STALE より先（矛盾window＋stale観測の複合入力）
  assert.throws(() => selectQuotaPool(makeInput({
    now: "2026-07-17T03:00:00.000Z",
    snapshots: [openaiPool({ windows: [makeWindow({ duration_seconds: 60 })] }), anthropicPool()],
  })), code("WINDOW_CONTRADICTION"));
  // SNAPSHOT_EXPIRED が SNAPSHOT_STALE より先（reset跨ぎ＋stale。poolのID順に依存しない）
  assert.throws(() => selectQuotaPool(makeInput({
    now: "2026-07-17T05:00:00.000Z",
    snapshots: [openaiPool(), anthropicPool()],
  })), code("SNAPSHOT_EXPIRED"));
  // SNAPSHOT_STALE（既定鮮度900sで鮮度切れのみ。窓は生きている）
  assert.throws(() => selectQuotaPool(makeInput({
    now: "2026-07-17T02:00:00.000Z",
    snapshots: [openaiPool(), anthropicPool()],
    policy: { ...DEFAULT_SELECTOR_POLICY },
  })), code("SNAPSHOT_STALE"));
  // SNAPSHOT_MISSING（候補にpool未対応）
  assert.throws(() => selectQuotaPool(makeInput({ snapshots: [openaiPool()] })), code("SNAPSHOT_MISSING"));
  // ROLE_NOT_BALANCED（observer/consultantは自動均衡対象外。snapshot健全時のみ到達）
  assert.throws(() => selectQuotaPool(makeInput({ role: "observer" })), code("ROLE_NOT_BALANCED"));
  assert.throws(() => selectQuotaPool(makeInput({ role: "consultant" })), code("ROLE_NOT_BALANCED"));
  // 未知roleはINVALID_SCHEMA（placement語彙外）
  assert.throws(() => selectQuotaPool(makeInput({ role: "implementer" })), code("INVALID_SCHEMA"));
  // 残量ゼロ・全候補不可はNO_ELIGIBLE_POOL（架空quotaでの成功扱いをしない）
  assert.throws(() => selectQuotaPool(makeInput({
    snapshots: [openaiPool({ windows: [makeWindow({ remaining_bp: 0 })] }), anthropicPool({ windows: [makeWindow({ remaining_bp: 0 })] })],
  })), code("NO_ELIGIBLE_POOL"));
  // observed_atが呼出側nowより未来 → INVALID_SCHEMA（clock skewは鮮度で吸収、未来観測は拒否）
  assert.throws(() => selectQuotaPool(makeInput({ now: "2026-07-16T23:00:00.000Z" })), code("INVALID_SCHEMA"));
  // 非決定入力の禁止: 入力echo以外の時刻を出力しない
  const decision = selectQuotaPool(makeInput());
  assert.equal(decision.evaluated_at, NOW);
});
