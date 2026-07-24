import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";

import { ROOT } from "./helpers.mjs";

// 同一repo writer直列化の全経路共通契約（ADR 0122）。正本は
// shared/orchestrate/composition.md「同一repo writerの直列化」節。
const path = await import("../../lib/orchestrate/execution-path.mjs");
const code = (expected) => (error) => error.code === expected;

const writer = (id, repo_root, effect) => ({ id, repo_root, effect });
const plan = (writers, lattice_selected) => path.planWriterExecution({ writers, lattice_selected });

test("read-onlyのfan-outは本数によらず並列のまま", () => {
  const readers = Array.from({ length: 12 }, (_, index) => writer(`r${index}`, "/repo/a", "read"));
  for (const selected of [false, true]) {
    const result = plan(readers, selected);
    assert.equal(result.mode, "parallel");
    assert.deepEqual(result.parallel, readers.map((entry) => entry.id));
    assert.deepEqual(result.serialized_groups, []);
  }
});

test("同一repoへのwriter 2件以上はLattice未選択で直列化される", () => {
  const writers = [writer("w1", "/repo/a", "write"), writer("w2", "/repo/a", "write"), writer("r1", "/repo/a", "read")];
  const result = plan(writers, false);
  assert.equal(result.mode, "serialized");
  assert.deepEqual(result.serialized_groups, [{
    repo_root: "/repo/a", reason: "same_repo_writers_without_lattice", writer_ids: ["w1", "w2"],
  }]);
  // read-onlyの子は直列化に巻き込まれない
  assert.deepEqual(result.parallel, ["r1"]);
});

test("別repoのwriterと単独writerは直列化されない", () => {
  const writers = [writer("w1", "/repo/a", "write"), writer("w2", "/repo/b", "write"), writer("w3", "/repo/c", "write")];
  const result = plan(writers, false);
  assert.equal(result.mode, "parallel");
  assert.deepEqual(result.parallel, ["w1", "w2", "w3"]);
  assert.deepEqual(result.serialized_groups, []);
});

test("Lattice選択時は同一repo writerを並列投入できる（交差判定はplan compileが所有）", () => {
  const writers = [writer("w1", "/repo/a", "write"), writer("w2", "/repo/a", "write")];
  assert.equal(plan(writers, false).mode, "serialized");
  const selected = plan(writers, true);
  assert.equal(selected.mode, "parallel");
  assert.deepEqual(selected.parallel, ["w1", "w2"]);
});

test("repo外writer 2件以上は判定不能としてLattice選択に関わらず直列化される", () => {
  const writers = [writer("w1", null, "write"), writer("w2", null, "write")];
  for (const selected of [false, true]) {
    const result = plan(writers, selected);
    assert.equal(result.mode, "serialized", `lattice_selected=${selected}`);
    assert.deepEqual(result.serialized_groups, [{
      repo_root: null, reason: "unidentified_repo_writers", writer_ids: ["w1", "w2"],
    }]);
  }
  // 単独なら直列化しない（交差相手がいない）
  assert.equal(plan([writer("w1", null, "write")], false).mode, "parallel");
});

test("複数repoが同時に条件を満たすと、それぞれ独立したgroupとして直列化される", () => {
  const writers = [
    writer("a1", "/repo/a", "write"), writer("b1", "/repo/b", "write"), writer("a2", "/repo/a", "write"),
    writer("b2", "/repo/b", "write"), writer("c1", "/repo/c", "write"), writer("n1", null, "write"), writer("n2", null, "write"),
  ];
  const result = plan(writers, false);
  assert.equal(result.mode, "serialized");
  assert.deepEqual(result.serialized_groups, [
    { repo_root: "/repo/a", reason: "same_repo_writers_without_lattice", writer_ids: ["a1", "a2"] },
    { repo_root: "/repo/b", reason: "same_repo_writers_without_lattice", writer_ids: ["b1", "b2"] },
    { repo_root: null, reason: "unidentified_repo_writers", writer_ids: ["n1", "n2"] },
  ]);
  assert.deepEqual(result.parallel, ["c1"]);
});

test("同じ入力は同じdecision_digestを返し、キー順・Lattice選択の差は別digestになる", () => {
  const writers = [writer("w1", "/repo/a", "write"), writer("w2", "/repo/a", "write")];
  const reordered = [{ effect: "write", id: "w1", repo_root: "/repo/a" }, { repo_root: "/repo/a", effect: "write", id: "w2" }];
  assert.equal(plan(writers, false).decision_digest, plan(reordered, false).decision_digest);
  assert.notEqual(plan(writers, false).decision_digest, plan(writers, true).decision_digest);
  assert.notEqual(plan(writers, false).decision_digest, plan([writers[0]], false).decision_digest);
});

test("closed入力: 余剰キー・欠落キー・型違い・重複idは拒否される", () => {
  const valid = writer("w1", "/repo/a", "write");
  assert.throws(() => path.planWriterExecution({ writers: [valid] }), code("INVALID_INPUT"));
  assert.throws(() => path.planWriterExecution({ writers: [valid], lattice_selected: false, extra: 1 }), code("INVALID_INPUT"));
  assert.throws(() => path.planWriterExecution({ writers: [valid], lattice_selected: "false" }), code("INVALID_INPUT"));
  assert.throws(() => path.planWriterExecution({ writers: valid, lattice_selected: false }), code("INVALID_WRITERS"));
  assert.throws(() => plan([{ ...valid, label: "x" }], false), code("INVALID_WRITERS"));
  assert.throws(() => plan([{ id: "w1", repo_root: "/repo/a" }], false), code("INVALID_WRITERS"));
  assert.throws(() => plan([{ ...valid, effect: "readwrite" }], false), code("INVALID_WRITERS"));
  assert.throws(() => plan([{ ...valid, repo_root: 1 }], false), code("INVALID_WRITERS"));
  assert.throws(() => plan([{ ...valid, id: "" }], false), code("INVALID_WRITERS"));
  assert.throws(() => plan([valid, writer("w1", "/repo/b", "write")], false), code("INVALID_WRITERS"));
  // 空集合は正当な入力（0件は失敗ではない）
  assert.equal(plan([], false).mode, "parallel");
});

test("判定moduleはLattice読取moduleをimportしない（単体成立を型で保証）", async () => {
  const source = await readFile(join(ROOT, "lib", "orchestrate", "execution-path.mjs"), "utf8");
  const imports = [...source.matchAll(/^import\s[^;]*?from\s+"([^"]+)"/gmu)].map((match) => match[1]);
  assert.deepEqual(imports.filter((entry) => /lattice/iu.test(entry)), [],
    "execution-path must not import any Lattice-facing module");
  assert.deepEqual(imports.sort(), ["./canonical-json.mjs", "node:crypto"]);
});

test("composition.mdが直列化規則と判定moduleの正本を持つ", async () => {
  const body = await readFile(join(ROOT, "shared", "orchestrate", "composition.md"), "utf8");
  for (const needle of [
    "lib/orchestrate/execution-path.mjs",
    "dotagents.execution-path.v1",
    "repo_root: null",
    "lattice_selected",
  ]) assert.ok(body.includes(needle), `composition.md must mention ${needle}`);
});
