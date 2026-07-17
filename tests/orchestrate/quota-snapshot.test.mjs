import assert from "node:assert/strict";
import { test } from "node:test";

import {
  QuotaSnapshotError, quotaSnapshotDigest, validateQuotaSnapshot, validateQuotaSnapshotSet,
  validateQuotaSnapshotShape, windowLengthSeconds,
} from "../../lib/orchestrate/quota-snapshot.mjs";
import { makeQuotaExecutor as makeExecutor, makeQuotaSnapshot as makeSnapshot, makeQuotaWindow as makeWindow } from "./helpers.mjs";

const code = (expected) => (error) => {
  assert.ok(error instanceof QuotaSnapshotError, `QuotaSnapshotError expected, got ${error?.constructor?.name}`);
  assert.equal(error.code, expected);
  return true;
};

test("quota snapshotはexact shape・bp整数・enum・envelopeをfail closedにする", () => {
  const snapshot = makeSnapshot();
  validateQuotaSnapshot(snapshot);
  assert.match(quotaSnapshotDigest(snapshot), /^[a-f0-9]{64}$/);
  assert.throws(() => validateQuotaSnapshot({ ...snapshot, extra: true }), code("INVALID_SCHEMA"));
  assert.throws(() => validateQuotaSnapshot({ ...snapshot, schema_version: "dotagents.quota-snapshot.v2" }), code("INVALID_SCHEMA"));
  assert.throws(() => validateQuotaSnapshot({ ...snapshot, provider: "xai" }), code("INVALID_SCHEMA"));
  assert.throws(() => validateQuotaSnapshot({ ...snapshot, source: "guess" }), code("INVALID_SCHEMA"));
  assert.throws(() => validateQuotaSnapshot({ ...snapshot, windows: [] }), code("INVALID_SCHEMA"));
  assert.throws(() => validateQuotaSnapshot({ ...snapshot, windows: [makeWindow({ remaining_bp: 10001 })] }), code("INVALID_SCHEMA"));
  assert.throws(() => validateQuotaSnapshot({ ...snapshot, windows: [makeWindow({ remaining_bp: 0.5 })] }), code("INVALID_SCHEMA"));
  assert.throws(() => validateQuotaSnapshot({ ...snapshot, windows: [makeWindow(), makeWindow()] }), code("INVALID_SCHEMA"));
  assert.throws(() => validateQuotaSnapshot({ ...snapshot, executor_scope: [makeExecutor(), makeExecutor()] }), code("INVALID_SCHEMA"));
  assert.throws(() => validateQuotaSnapshot({ ...snapshot, executor_scope: [{ adapter_id: "codex-sidecar", instance_id: "x" }] }), code("INVALID_SCHEMA"));
  // 時差: canonical ISO UTC以外（offset付き）はfail closed
  assert.throws(() => validateQuotaSnapshot({ ...snapshot, observed_at: "2026-07-17T09:00:00.000+09:00" }), code("INVALID_SCHEMA"));
});

test("window矛盾（starts_at逆転・reset境界・length超過）はWINDOW_CONTRADICTIONでfail loudになる", () => {
  const startsAtWindow = { window_id: "weekly", starts_at: "2026-07-14T00:00:00.000Z", reset_at: "2026-07-21T00:00:00.000Z", remaining_bp: 9000, model_family_scope: null };
  validateQuotaSnapshot(makeSnapshot({ windows: [startsAtWindow] }));
  assert.equal(windowLengthSeconds(startsAtWindow), 7 * 24 * 3600);
  assert.equal(windowLengthSeconds(makeWindow()), 5 * 3600);
  // starts_at >= reset_at（manual入力のreset日誤り）
  assert.throws(() => validateQuotaSnapshot(makeSnapshot({ windows: [{ ...startsAtWindow, starts_at: "2026-07-22T00:00:00.000Z" }] })), code("WINDOW_CONTRADICTION"));
  // reset境界: reset_at == observed_at
  assert.throws(() => validateQuotaSnapshot(makeSnapshot({ windows: [makeWindow({ reset_at: "2026-07-17T00:00:00.000Z" })] })), code("WINDOW_CONTRADICTION"));
  // 残り時間 > window_length（duration型）
  assert.throws(() => validateQuotaSnapshot(makeSnapshot({ windows: [makeWindow({ duration_seconds: 3600 })] })), code("WINDOW_CONTRADICTION"));
  // shape違反はwindow矛盾より先にINVALID_SCHEMA（エラー検査順）
  assert.throws(() => validateQuotaSnapshot(makeSnapshot({ source: "guess", windows: [makeWindow({ duration_seconds: 3600 })] })), code("INVALID_SCHEMA"));
});

test("snapshot setはpool ID重複とexecutorの複数pool帰属を拒否する", () => {
  const first = makeSnapshot();
  const second = makeSnapshot({
    quota_pool_id: "anthropic-sub-main", provider: "anthropic",
    executor_scope: [makeExecutor({ adapter_id: "claude-native", handle_schema_id: "claude-native.session.v1" })],
  });
  validateQuotaSnapshotSet([first, second]);
  assert.throws(() => validateQuotaSnapshotSet([first, makeSnapshot({ provider: "anthropic" })]), code("INVALID_SCHEMA"));
  assert.throws(() => validateQuotaSnapshotSet([first, { ...second, executor_scope: [makeExecutor()] }]), code("INVALID_SCHEMA"));
  // set検証でもshape全通過後にwindow矛盾（順序固定）
  assert.throws(() => validateQuotaSnapshotSet([first, { ...second, windows: [makeWindow({ duration_seconds: 60 })] }]), code("WINDOW_CONTRADICTION"));
});

test("quota_snapshot.windowsはMAX_WINDOWS=16件まで通り17件目はINVALID_SCHEMAで拒否される", () => {
  const makeUniqueWindows = (count) => Array.from({ length: count }, (_, index) => makeWindow({ window_id: `w${index}` }));
  validateQuotaSnapshotShape(makeSnapshot({ windows: makeUniqueWindows(16) }));
  assert.throws(() => validateQuotaSnapshotShape(makeSnapshot({ windows: makeUniqueWindows(17) })), code("INVALID_SCHEMA"));
});

test("digestはcanonical JSONで決定的・field順序に非依存", () => {
  const snapshot = makeSnapshot();
  const reordered = Object.fromEntries(Object.entries(snapshot).reverse());
  assert.equal(quotaSnapshotDigest(snapshot), quotaSnapshotDigest(reordered));
  assert.notEqual(quotaSnapshotDigest(snapshot), quotaSnapshotDigest(makeSnapshot({ windows: [makeWindow({ remaining_bp: 6999 })] })));
});
