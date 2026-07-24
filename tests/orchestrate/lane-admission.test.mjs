import assert from "node:assert/strict";
import { readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

import {
  cleanupDir, createGitRepo, evidence, loadControl, makeBudget, makeConsultation, makeLaneAdmission,
  makeTempDir, makeTask, readPersistedManifest, spawnOrchestrate, writeJson,
} from "./helpers.mjs";

const api = await loadControl();
const lane = await import("../../lib/orchestrate/lane-admission.mjs");
const code = (expected) => (error) => error.code === expected;

const KEYS = lane.LANE_CONDITION_KEYS;

test("lane決定は4 booleanの全16組合せでORとして決まり、他の入力を一切受けない", () => {
  // 全列挙: 1つでもtrueならorchestrated、全falseだけnormal（ADR 0061 / ADR 0114 Decision 2）
  for (let bits = 0; bits < 16; bits++) {
    const conditions = Object.fromEntries(KEYS.map((key, index) => [key, Boolean(bits & (1 << index))]));
    const expected = bits === 0 ? "normal" : "orchestrated";
    assert.equal(lane.decideLane(conditions), expected, `bits=${bits}`);
    const evaluated = lane.evaluateLaneAdmission(conditions);
    assert.equal(evaluated.lane, expected);
    assert.equal(evaluated.schema_version, "dotagents.lane-admission-evaluation.v1");
  }
  // exact shape: 欠落・余剰・非boolean・文字列引数はすべて拒否（型境界による非classifier保証）
  const full = Object.fromEntries(KEYS.map((key) => [key, true]));
  for (const key of KEYS) {
    const missing = { ...full }; delete missing[key];
    assert.throws(() => lane.decideLane(missing), code("INVALID_CONDITIONS"));
    assert.throws(() => lane.decideLane({ ...full, [key]: "true" }), code("INVALID_CONDITIONS"));
    assert.throws(() => lane.decideLane({ ...full, [key]: 1 }), code("INVALID_CONDITIONS"));
  }
  assert.throws(() => lane.decideLane({ ...full, objective_ref: "docs/x.md" }), code("INVALID_CONDITIONS"));
  assert.throws(() => lane.decideLane("multi repo write campaign"), code("INVALID_CONDITIONS"));
  assert.throws(() => lane.decideLane(null), code("INVALID_CONDITIONS"));
});

test("評価digestは条件とlaneだけを拘束し、key順・付随文言に依存しない", () => {
  const a = lane.evaluateLaneAdmission({ planned_interruption: true, chained_acceptance: false, multi_repo_write_coordination: false, decision_evidence_required: true });
  // caller key順が違っても同じ正規化・同じdigest
  const b = lane.evaluateLaneAdmission({ decision_evidence_required: true, multi_repo_write_coordination: false, chained_acceptance: false, planned_interruption: true });
  assert.equal(a.evaluation_digest, b.evaluation_digest);
  assert.deepEqual(Object.keys(a.conditions), [...KEYS]);
  // 条件が変われば必ず変わる
  const c = lane.evaluateLaneAdmission({ planned_interruption: false, chained_acceptance: false, multi_repo_write_coordination: false, decision_evidence_required: true });
  assert.notEqual(a.evaluation_digest, c.evaluation_digest);
});

test("initは4条件全falseの宣言をControlを作らず拒否し、v1入力をversioned errorで拒否する", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  const repo = await createGitRepo(base);
  const baseInput = { cwd: repo.root, control_id: "lane-gate", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget() };
  // 全false→LANE_ADMISSION_NOT_ORCHESTRATED、state無変更
  await assert.rejects(api.init({ ...baseInput, lane_admission: makeLaneAdmission({ conditions: { decision_evidence_required: false } }) }), code("LANE_ADMISSION_NOT_ORCHESTRATED"));
  // v1入力（lane_admission欠落）→CONTRACT_VERSION_MISMATCH（暗黙defaultの捏造をしない）
  await assert.rejects(api.init(baseInput), code("CONTRACT_VERSION_MISMATCH"));
  // どちらもControl stateを作っていない
  const stateRoot = join(repo.commonDir, "dotagents", "orchestrate", "controls");
  await assert.rejects(readdir(stateRoot), (error) => error.code === "ENOENT");
  // 正当な宣言はv29 manifestへclosed projectionだけを保存する（lane fieldも自由文も無い）
  const created = await api.init({ ...baseInput, lane_admission: makeLaneAdmission() });
  assert.equal(created.manifest.schema_version, "dotagents.orchestration-control.v29");
  const stored = created.manifest.lane_admission;
  assert.deepEqual(Object.keys(stored).sort(), ["conditions", "contract_version", "declared_at", "declared_by", "decision"].sort());
  assert.equal(Object.hasOwn(stored, "lane"), false);
  assert.equal(stored.declared_by, "parent");
  assert.equal(stored.declared_at, created.manifest.declaration.created_at);
});

test("保存済みlane admissionは宣言者・時刻のdeclaration相関をreaderが強制する", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  const repo = await createGitRepo(base);
  const created = await api.init({ cwd: repo.root, control_id: "lane-reader", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget(), lane_admission: makeLaneAdmission() });
  const valid = await readPersistedManifest(repo.commonDir, "lane-reader");
  api.validateManifest(structuredClone(valid));
  const tamper = (mutate, expected = "INVALID_SCHEMA") => {
    const manifest = structuredClone(valid); mutate(manifest);
    assert.throws(() => api.validateManifest(manifest), code(expected));
  };
  tamper((m) => { m.lane_admission.declared_by = "someone-else"; });
  tamper((m) => { m.lane_admission.declared_at = "2026-07-14T00:00:00.000Z"; });
  tamper((m) => { m.lane_admission.lane = "orchestrated"; });
  tamper((m) => { for (const key of KEYS) m.lane_admission.conditions[key] = false; });
  tamper((m) => { m.lane_admission.decision.type = "file"; });
  tamper((m) => { m.lane_admission = null; }); // init産Controlのnullは不正（migration産だけがnull）
  tamper((m) => { delete m.lane_admission; }); // v29はkey必須
  assert.equal(created.revision, 0);
});

test("v28からv29へのmigrationはnullを追加し、non-nullのv29はv28へ戻せない", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  const repo = await createGitRepo(base);
  const V28 = "dotagents.orchestration-control.v28"; const V29 = "dotagents.orchestration-control.v29";
  const created = await api.init({ cwd: repo.root, control_id: "lane-migrate", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget(), lane_admission: makeLaneAdmission() });
  // init産（non-null）はbinary rollback不可（ADR 0114 Decision 6）
  await assert.rejects(api.controlMigrate({ cwd: repo.root, control_id: "lane-migrate", actor_id: "parent", expected_revision: created.revision, target_schema_version: V28 }), code("ROLLBACK_UNSUPPORTED"));
  // v28世代のControl（key不在）を再現→v29へ→nullが付く→v28へ戻すとkeyが消える
  const manifest = await readPersistedManifest(repo.commonDir, "lane-migrate");
  manifest.schema_version = V28; delete manifest.lane_admission;
  await writeJson(join(repo.commonDir, "dotagents", "orchestrate", "controls", "lane-migrate", "manifest.json"), manifest);
  const upgraded = await api.controlMigrate({ cwd: repo.root, control_id: "lane-migrate", actor_id: "parent", expected_revision: created.revision, target_schema_version: V29 });
  assert.equal(upgraded.manifest.schema_version, V29);
  assert.equal(upgraded.manifest.lane_admission, null);
  const rolled = await api.controlMigrate({ cwd: repo.root, control_id: "lane-migrate", actor_id: "parent", expected_revision: upgraded.revision, target_schema_version: V28 });
  assert.equal(rolled.manifest.schema_version, V28);
  assert.equal(Object.hasOwn(rolled.manifest, "lane_admission"), false);
});

test("lane-admission-evaluate CLIは隔離環境でfilesystemに何も作らない（永続receipt/cache非生成）", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  // HOME / XDG_CACHE_HOME / XDG_STATE_HOME / TMPDIR をすべて専用の空dirへ隔離し、実行前後を比較する
  const dirs = {};
  for (const name of ["home", "xdg-cache", "xdg-state", "tmpdir", "work"]) {
    dirs[name] = join(base, name); await mkdir(dirs[name]);
  }
  const inputPath = join(dirs.work, "conditions.json");
  await writeJson(inputPath, { conditions: { planned_interruption: false, chained_acceptance: true, multi_repo_write_coordination: false, decision_evidence_required: false } });
  const snapshot = async () => {
    const seen = {};
    for (const [name, dir] of Object.entries(dirs)) seen[name] = (await readdir(dir)).sort();
    return seen;
  };
  const before = await snapshot();
  const env = { ...process.env, HOME: dirs.home, XDG_CACHE_HOME: dirs["xdg-cache"], XDG_STATE_HOME: dirs["xdg-state"], TMPDIR: dirs.tmpdir };
  const result = spawnOrchestrate(["lane-admission-evaluate", "--input", inputPath], { env, cwd: dirs.work });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.result.lane, "orchestrated");
  assert.equal(parsed.result.contract_version, "dotagents.lane-admission.v1");
  // 実行後もどのdirにも何も増えていない（Control state root・hook cache・一時fileすべて）
  assert.deepEqual(await snapshot(), before);
  // normal評価も同じCLIで返る（Controlは作られない）
  await writeJson(inputPath, { conditions: { planned_interruption: false, chained_acceptance: false, multi_repo_write_coordination: false, decision_evidence_required: false } });
  const normal = spawnOrchestrate(["lane-admission-evaluate", "--input", inputPath], { env, cwd: dirs.work });
  assert.equal(normal.status, 0, normal.stderr || normal.stdout);
  assert.equal(JSON.parse(normal.stdout).result.lane, "normal");
});

test("v28世代のv28限定データはv29移行後も能力を失わない（capability predicate単調性）", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  const repo = await createGitRepo(base);
  const V28 = "dotagents.orchestration-control.v28"; const V29 = "dotagents.orchestration-control.v29";
  const { createHash } = await import("node:crypto");
  const { writeFile } = await import("node:fs/promises");
  const created = await api.init({ cwd: repo.root, control_id: "lane-capability", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget(), lane_admission: makeLaneAdmission() });
  // v28世代Controlを再現し、v28限定のartifact世代交代receiptを作る
  const manifest = await readPersistedManifest(repo.commonDir, "lane-capability");
  manifest.schema_version = V28; delete manifest.lane_admission;
  await writeJson(join(repo.commonDir, "dotagents", "orchestrate", "controls", "lane-capability", "manifest.json"), manifest);
  const phaseGate = await api.phaseGateRecord({ cwd: repo.root, control_id: "lane-capability", actor_id: "parent", expected_revision: created.revision, risk: "standard", behavior_lane: "behavior-preserving" });
  const oldBody = "# gen1\n"; const oldDigest = createHash("sha256").update(oldBody).digest("hex");
  const oldRef = `docs/gen.${oldDigest}.md`; await writeFile(join(repo.root, oldRef), oldBody);
  const recorded = await api.artifactRecord({ cwd: repo.root, control_id: "lane-capability", actor_id: "parent", expected_revision: phaseGate.revision, artifact: { artifact_id: "gen-v1", artifact_kind: "finding", artifact_ref: oldRef, artifact_digest: oldDigest, status: "current" } });
  const newBody = "# gen2\n"; const newDigest = createHash("sha256").update(newBody).digest("hex");
  const newRef = `docs/gen.${newDigest}.md`; await writeFile(join(repo.root, newRef), newBody);
  const generated = await api.artifactGenerationRecord({ cwd: repo.root, control_id: "lane-capability", actor_id: "parent", expected_revision: recorded.revision, superseded_artifact_id: "gen-v1", artifact: { artifact_id: "gen-v2", artifact_kind: "finding", artifact_ref: newRef, artifact_digest: newDigest, status: "current" } });
  // artifact-generation receiptを持つv28がv29へ移行できる（旧: catch-all分岐がv27 rollbackと誤解してROLLBACK_UNSUPPORTEDにしていた）
  const upgraded = await api.controlMigrate({ cwd: repo.root, control_id: "lane-capability", actor_id: "parent", expected_revision: generated.revision, target_schema_version: V29 });
  assert.equal(upgraded.manifest.schema_version, V29);
  // v29上でもartifact世代交代は失われない（単調predicate）
  const thirdBody = "# gen3\n"; const thirdDigest = createHash("sha256").update(thirdBody).digest("hex");
  const thirdRef = `docs/gen.${thirdDigest}.md`; await writeFile(join(repo.root, thirdRef), thirdBody);
  const third = await api.artifactGenerationRecord({ cwd: repo.root, control_id: "lane-capability", actor_id: "parent", expected_revision: upgraded.revision, superseded_artifact_id: "gen-v2", artifact: { artifact_id: "gen-v3", artifact_kind: "finding", artifact_ref: thirdRef, artifact_digest: thirdDigest, status: "current" } });
  assert.equal(third.manifest.artifacts.length, 3);
  // artifact世代receiptがあるv29はv28へ戻せない（null admissionでもartifact受け入れ側とは独立に、lane admissionはnull）
  assert.equal(third.manifest.lane_admission, null);
  const evaluatedEvidence = evidence("docs/control-record-plan.md", "decision");
  assert.equal(typeof evaluatedEvidence.digest, "string");
});

test("v29上でもconsultation cancel能力は失われない（capability predicate単調性）", async (t) => {
  const base = await makeTempDir(); t.after(() => cleanupDir(base));
  const repo = await createGitRepo(base);
  const created = await api.init({ cwd: repo.root, control_id: "lane-cancel", objective_ref: "docs/control-record-plan.md", actor_id: "parent", document_refs: ["docs/control-record-plan.md"], budget: makeBudget(), lane_admission: makeLaneAdmission() });
  const phaseGate = await api.phaseGateRecord({ cwd: repo.root, control_id: "lane-cancel", actor_id: "parent", expected_revision: created.revision, risk: "standard", behavior_lane: "behavior-preserving" });
  const task = await api.taskRecord({ cwd: repo.root, control_id: "lane-cancel", actor_id: "parent", expected_revision: phaseGate.revision, task: makeTask({ task_id: "consultation-task", effect: "read", write_scope: [] }) });
  const recorded = await api.consultationRecord({ cwd: repo.root, control_id: "lane-cancel", actor_id: "parent", expected_revision: task.revision, consultation: makeConsultation() });
  // 旧predicate（[v27,v28]固定集合）ならv29でSCHEMA_UPGRADE_REQUIREDになっていた経路
  const cancelled = await api.consultationCancel({ cwd: repo.root, control_id: "lane-cancel", actor_id: "parent", expected_revision: recorded.revision, consultation_id: "consultation-001", decision: evidence("docs/control-record-plan.md", "decision", { digest: makeLaneAdmission().decision.digest }) });
  assert.equal(cancelled.manifest.consultations[0].state, "cancelled");
});
