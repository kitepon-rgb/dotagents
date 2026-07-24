#!/usr/bin/env node
import { constants as FS } from "node:fs";
import { lstat, open } from "node:fs/promises";
import process from "node:process";

import * as api from "../lib/orchestrate/control-record.mjs";

const commands = new Map([
  ["init", api.init], ["status", api.status], ["task-record", api.taskRecord], ["task-cancel-record", api.taskCancelRecord],
  ["registry-observation-record", api.registryObservationRecord],
  ["placement-dry-run", api.placementDryRun],
  ["advisory-snapshot", api.advisorySnapshot],
  ["placement-reserve", api.reservePlacement],
  ["delegation-packet", api.delegationPacketForWorker],
  ["delegation-packet-recover", api.recoverDelegationPacketForWorker],
  ["worker-report-skeleton", api.workerReportSkeletonForWorker],
  ["worker-report-import", api.importWorkerReport],
  ["campaign-record", api.campaignRecord], ["campaign-status", api.campaignStatus], ["campaign-release", api.releaseCampaign],
  ["artifact-record", api.artifactRecord], ["artifact-status", api.artifactStatus], ["artifact-status-record", api.artifactStatusRecord], ["artifact-generation-record", api.artifactGenerationRecord],
  ["approach-family-record", api.approachFamilyGovernanceRecord], ["approach-family-status", api.approachFamilyStatus], ["approach-family-block", api.approachFamilyBlock], ["approach-family-reopen", api.approachFamilyReopen],
  ["phase-gate-record", api.phaseGateRecord], ["phase-gate-status", api.phaseGateStatus], ["phase-gate-advance", api.phaseGateAdvance],
  ["resume-check", api.resumeCheck],
  ["control-migrate", api.controlMigrate],
  ["worker-run-record", api.workerRunRecord], ["consultation-record", api.consultationRecord],
  ["admit-worker", api.admitWorker], ["worker-workspace-bind", api.bindWorkerWorkspace], ["worker-cancel-request", api.requestWorkerCancel], ["observe-worker", api.observeWorker],
  ["observe-consultation", api.observeConsultation], ["consultation-cancel", api.consultationCancel], ["conflict-check", api.conflictCheck],
  ["accept", api.accept], ["reject", api.reject], ["task-finalize-record", api.taskFinalizeRecord],
  ["control-finalize", api.finalizeControl], ["recover-lock", api.recoverLock], ["archive", api.archive],
  ["quota-pool-lock-acquire", api.quotaPoolLockAcquire], ["quota-pool-lock-release", api.quotaPoolLockRelease],
]);

function outputError(code, message, exitCode) {
  process.stderr.write(`${JSON.stringify({ ok: false, code, message })}\n`);
  process.exitCode = exitCode;
}

async function readInput(path) {
  let handle;
  try {
    const pathInfo = await lstat(path);
    if (pathInfo.isSymbolicLink() || !pathInfo.isFile() || pathInfo.nlink !== 1) throw new api.ControlRecordError("INPUT_PATH_UNSAFE", "input must be a non-symlink regular file");
    handle = await open(path, FS.O_RDONLY | (FS.O_NOFOLLOW ?? 0)); const before = await handle.stat();
    if (!before.isFile() || before.nlink !== 1) throw new api.ControlRecordError("INPUT_PATH_UNSAFE", "input must be a safe regular file");
    if (before.size > 64 * 1024) throw new api.ControlRecordError("LIMIT_EXCEEDED", "input exceeds 64 KiB", { category: "input" });
    const buffer = Buffer.alloc(before.size + 1); let offset = 0;
    while (offset < buffer.length) { const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset); if (!bytesRead) break; offset += bytesRead; }
    if (offset > 64 * 1024) throw new api.ControlRecordError("LIMIT_EXCEEDED", "input exceeds 64 KiB", { category: "input" });
    const after = await handle.stat(); const finalPath = await lstat(path);
    if (before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs || after.dev !== finalPath.dev || after.ino !== finalPath.ino || finalPath.isSymbolicLink() || finalPath.nlink !== 1) throw new api.ControlRecordError("INPUT_PATH_UNSAFE", "input changed while reading");
    let decoded;
    try { decoded = new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, offset)); } catch { throw new api.ControlRecordError("INVALID_INPUT", "input is not valid UTF-8"); }
    let value; try { value = JSON.parse(decoded); } catch { throw new api.ControlRecordError("INVALID_INPUT", "input is not valid JSON"); }
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new api.ControlRecordError("INVALID_INPUT", "input JSON must be an object");
    return value;
  } catch (error) {
    if (error instanceof api.ControlRecordError) throw error;
    if (error.code === "ELOOP") throw new api.ControlRecordError("INPUT_PATH_UNSAFE", "input symlink is forbidden");
    throw new api.ControlRecordError("INPUT_PATH_UNSAFE", "input file cannot be read");
  } finally { await handle?.close().catch(() => {}); }
}

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  process.stdout.write(`${JSON.stringify({ contract_version: "dotagents.orchestrate.control-record.v1", mode: "record-only", external_execution: false, commands: [...commands.keys()], flags: { status: ["--brief"] } })}\n`);
} else if (!((args.length === 3 && commands.has(args[0]) && args[1] === "--input" && !args[2].startsWith("--"))
  || (args.length === 4 && args[0] === "status" && args[1] === "--brief" && args[2] === "--input" && !args[3].startsWith("--")))) {
  outputError("INVALID_INPUT", "usage: orchestrate-run <command> [--brief] --input <json-file>", 2);
} else {
  const brief = args.length === 4; const command = brief ? "status --brief" : args[0];
  try {
    const input = await readInput(brief ? args[3] : args[2]);
    // phase-gate-before-first-task の強制は library taskRecord に一元化した
    // （CLI経路と直接API経路で同一gateを通す）。ここでの重複pre-checkは廃止。
    const result = await (brief ? api.statusBrief : commands.get(command))(input);
    if (command === "resume-check") {
      const summary = { outcome: result.outcome, blocking_count: result.blocking_reasons.length, review_count: result.review_reasons.length };
      process.stdout.write(`${JSON.stringify({ ok: true, command, summary, result })}\n`);
    } else {
      process.stdout.write(`${JSON.stringify({ ok: true, command, result })}\n`);
    }
  } catch (error) {
    if (error instanceof api.ControlRecordError) {
      const inputError = new Set(["INVALID_INPUT", "INVALID_SCHEMA", "INVALID_SCOPE", "INPUT_PATH_UNSAFE"]);
      const isInputLimit = error.code === "LIMIT_EXCEEDED" && error.details?.category === "input";
      outputError(error.code, error.message, inputError.has(error.code) || isInputLimit ? 2 : 1);
    } else outputError("INTERNAL_ERROR", "internal error", 1);
  }
}
