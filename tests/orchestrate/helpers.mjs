/** Test-only fixtures for the Control Record contract. */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, link, lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

export const ROOT = resolve(import.meta.dirname, "..", "..");
export const CONTROL_LIB = join(ROOT, "lib", "orchestrate", "control-record.mjs");
export const ORCHESTRATE_BIN = join(ROOT, "bin", "orchestrate-run.mjs");
export const OWNER_SCHEMA = "dotagents.orchestration-lock-owner.v1";
export const MiB = 1024 * 1024;

export const loadControl = () => import(CONTROL_LIB);
export const makeTempDir = (prefix = "orchestrate-test-") => mkdtemp(join(tmpdir(), prefix));
export const cleanupDir = (dir) => rm(dir, { recursive: true, force: true });

export const evidence = (ref, type = "file", overrides = {}) => ({
  type, ref, digest: "e".repeat(64), observed_at: "2026-07-14T00:00:00.000Z", ...overrides,
});

const canonicalJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};

export function taskAdmissionDigest(task) {
  const snapshot = structuredClone(task);
  delete snapshot.admission_digest;
  return createHash("sha256").update(canonicalJson(snapshot)).digest("hex");
}

export function runGit(cwd, args, extraEnv = {}) {
  return execFileSync("git", args, {
    cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, ...extraEnv },
  }).trim();
}

export async function createGitRepo(baseDir, name = "repo") {
  const root = join(baseDir, name);
  await mkdir(root, { recursive: true });
  runGit(root, ["init", "-q"]);
  runGit(root, ["config", "user.email", "control-record@example.test"]);
  runGit(root, ["config", "user.name", "Control Record Test"]);
  await writeFile(join(root, "README.md"), "# control record fixture\n");
  await mkdir(join(root, "docs"));
  await writeFile(join(root, "docs", "control-record-plan.md"), "# Control Record fixture plan\n");
  runGit(root, ["add", "README.md", "docs/control-record-plan.md"]);
  runGit(root, ["commit", "-q", "-m", "initial fixture"]);
  const commonDir = runGit(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  const gitDir = runGit(root, ["rev-parse", "--path-format=absolute", "--git-dir"]);
  return {
    root: await realpath(root), commonDir: await realpath(commonDir), gitDir: await realpath(gitDir),
    baseSha: runGit(root, ["rev-parse", "HEAD"]),
  };
}

export async function createBareRepo(baseDir, sourceRepo = null) {
  const root = join(baseDir, "bare.git");
  if (sourceRepo) runGit(baseDir, ["clone", "--bare", "-q", sourceRepo.root, root]);
  else { await mkdir(root, { recursive: true }); runGit(root, ["init", "--bare", "-q"]); }
  return { root: await realpath(root) };
}

export async function createNonGitDir(baseDir) {
  const root = join(baseDir, "not-a-repository");
  await mkdir(root, { recursive: true });
  return root;
}

export async function addLinkedWorktree(repo, name = "linked-worktree") {
  const root = join(dirname(repo.root), name);
  runGit(repo.root, ["worktree", "add", "-q", "-b", `branch-${name}`, root]);
  return {
    root: await realpath(root),
    commonDir: await realpath(runGit(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"])),
    gitDir: await realpath(runGit(root, ["rev-parse", "--path-format=absolute", "--git-dir"])),
  };
}

export function makeTask(overrides = {}) {
  return {
    task_id: "task-001", title: "Control Record contract test", classification: "A", effect: "write",
    doc_ref: "docs/control-record-plan.md",
    role: "implementer", lane: "behavior-preserving", depends_on: [],
    required_capabilities: ["workspace.write", "report.structured"], isolation: "dedicated-worktree",
    context_policy: {
      share_objective: true, share_current_candidate: false, share_existing_findings: false,
      share_failed_approaches: false, share_test_results: true,
    },
    validation: ["node --test tests/orchestrate/*.test.mjs"],
    non_goals: ["Executorを自動起動しない"], known_traps: ["runtime stateをdocsへ複製しない"],
    read_scope: [{ kind: "directory", path: "shared/orchestrate" }],
    write_scope: [{ kind: "directory", path: "lib/orchestrate" }],
    approval_ref: null, alternative_group: null, ...overrides,
  };
}

export function makeWorkerRun(overrides = {}) {
  return {
    worker_run_id: "run-001", task_id: "task-001", assignment_id: "assignment-001",
    executor: "codex-sidecar", role_ref: "implementer", workspace_cwd: "/workspace-is-resolved-by-library",
    write_mode: "direct",
    execution_verification: { stage: "execution-verified", observed_version: "test-version", observed_at: "2026-07-14T00:00:00.000Z", evidence: evidence("docs/execution-proof.md") },
    state: "planned", executor_handle: { idempotency_key: "idempotency-001" },
    executor_observation: null, admission: null, dispatch_evidence: [], dispatch_attempt_evidence: [],
    terminal_evidence: [], result: null, acceptance: null, ...overrides,
  };
}

export function makeConsultation(overrides = {}) {
  return {
    consultation_id: "consultation-001", task_id: "consultation-task", assignment_id: "consultation-assignment",
    connector: "gpt-connector", slug: "known-session-slug", model: "gpt-5.6", effort: "low",
    state: "planned", executor_observation: null, decision_ref: null, terminal_evidence: [], ...overrides,
  };
}

export const workerObservation = (state, overrides = {}) => ({
  state, source: "codex-sidecar", observed_version: "test-version", observed_at: "2026-07-14T00:01:00.000Z", raw_state: state,
  ...(state === "dispatched" ? { dispatch_evidence: [evidence("docs/dispatch-proof.md")] } : {}),
  ...overrides,
});
export const completedWorkerObservation = (overrides = {}) => workerObservation("completed", {
  result: { result_digest: "a".repeat(64), evidence: [evidence("docs/worker-result.md")] }, ...overrides,
});
export const terminalWorkerObservation = (raw_state = "failed", overrides = {}) => workerObservation(raw_state, {
  terminal_evidence: [evidence("docs/executor-terminal-proof.md")], ...overrides,
});

export function spawnOrchestrate(args, options = {}) {
  return spawnSync(process.execPath, [ORCHESTRATE_BIN, ...args], { encoding: "utf8", ...options });
}

export async function writeJson(path, value, mode = 0o600) {
  await writeFile(path, `${JSON.stringify(value)}\n`, { mode });
}

export async function controlStatePaths(commonDir, controlId) {
  const root = join(commonDir, "dotagents", "orchestrate");
  return { root, controlDir: join(root, "controls", controlId), manifest: join(root, "controls", controlId, "manifest.json"), owners: join(root, "lock-owners") };
}

export async function readPersistedManifest(commonDir, controlId) {
  const paths = await controlStatePaths(commonDir, controlId);
  return JSON.parse(await readFile(paths.manifest, "utf8"));
}

export function owner(token, pid, overrides = {}) {
  return { schema_version: OWNER_SCHEMA, token, pid, acquired_at: "2026-07-14T00:00:00.000Z", ...overrides };
}

export async function createOwnerFixtures(commonDir) {
  const { owners } = await controlStatePaths(commonDir, "unused");
  await mkdir(owners, { recursive: true, mode: 0o700 });
  const paths = {};
  paths.dead = join(owners, "11111111-1111-4111-8111-111111111111.owner");
  await writeJson(paths.dead, owner("11111111-1111-4111-8111-111111111111", 99999999));
  paths.live = join(owners, "22222222-2222-4222-8222-222222222222.owner");
  await writeJson(paths.live, owner("22222222-2222-4222-8222-222222222222", process.pid));
  paths.malformed = join(owners, "33333333-3333-4333-8333-333333333333.owner");
  await writeFile(paths.malformed, "not-json\n", { mode: 0o600 });
  paths.tokenMismatch = join(owners, "44444444-4444-4444-8444-444444444444.owner");
  await writeJson(paths.tokenMismatch, owner("55555555-5555-4555-8555-555555555555", 99999999));
  const normal = join(owners, "normal.owner");
  await writeJson(normal, owner("66666666-6666-4666-8666-666666666666", 99999999));
  paths.symlink = join(owners, "66666666-6666-4666-8666-666666666666.owner");
  await symlink(normal, paths.symlink);
  const hardTarget = join(owners, "hard-target.owner");
  await writeJson(hardTarget, owner("77777777-7777-4777-8777-777777777777", 99999999));
  paths.hardlink = join(owners, "77777777-7777-4777-8777-777777777777.owner");
  await link(hardTarget, paths.hardlink);
  return paths;
}

/** Create a real (not proxy) 64 MiB regular file. */
export async function createFingerprintBoundaryFiles(cwd) {
  const accepted = join(cwd, "exactly-64MiB.bin");
  await writeFile(accepted, "x");
  await truncate(accepted, 64 * MiB);
  return { accepted, acceptedStat: await lstat(accepted) };
}

/** Create a real 64 MiB + 1 byte regular file after the acceptance check. */
export async function createOversizedFingerprintFile(cwd) {
  const rejected = join(cwd, "over-64MiB.bin");
  await writeFile(rejected, "x");
  await truncate(rejected, (64 * MiB) + 1);
  return { rejected, rejectedStat: await lstat(rejected) };
}

export async function installSentinelBin(base) {
  const bin = join(base, "sentinel-bin");
  const log = join(base, "forbidden-execution.log");
  await mkdir(bin);
  for (const command of ["curl", "wget", "gpt-connector", "codex", "claude", "aiterm-mcp"]) {
    const script = join(bin, command);
    await writeFile(script, `#!/bin/sh\necho ${command} >> '${log}'\nexit 97\n`, { mode: 0o700 });
    await chmod(script, 0o700);
  }
  const realGit = execFileSync("which", ["git"], { encoding: "utf8" }).trim();
  const git = join(bin, "git");
  await writeFile(git, `#!/bin/sh
case " $* " in
  *" worktree add "*|*" checkout "*|*" switch "*|*" commit "*|*" push "*|*" merge "*)
    echo "git:$*" >> '${log}'
    exit 98 ;;
esac
exec "${realGit}" "$@"
`, { mode: 0o700 });
  await chmod(git, 0o700);
  return { bin, log };
}
