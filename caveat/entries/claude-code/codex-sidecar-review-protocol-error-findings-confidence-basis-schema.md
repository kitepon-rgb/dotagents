---
id: codex-sidecar-review-protocol-error-findings-confidence-basis-schema
title: 'codex-sidecar review が PROTOCOL_ERROR: findings.confidence / basis の schema 不一致で完全に失敗'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - codex-sidecar
  - mcp
  - protocol-error
  - structured-output
  - review
environment:
  os: Linux 6.6.87.2-microsoft-standard-WSL2
  arch: x64
  node: v24.14.0
  shell: bash
  mcp_tool: codex-sidecar (mcp__codex-sidecar__codex_review)
  sidecar_codex_home: /tmp/codex-sidecar-home-XXXXXX (auto)
  result_format: json
  workflow: review
source_project: null
source_session: 2026-05-14T00:21:05.583Z/88ee60d69536
created_at: 2026-05-14
updated_at: 2026-05-14
last_verified: 2026-05-14
---

## Context

原因調査セッション中、 直近 3 修正 commit のレビューを自動監査ツールから促されて codex_review を呼んだら sidecar 自身が schema validation で死んだ。 手動レビューに切り替えて完了。

## Symptom

mcp__codex-sidecar__codex_review を呼ぶと sidecar 自身が次のエラーで失敗し App Server を起動すらしない:

```
status: failed
workflow: review
summary: PROTOCOL_ERROR: assistant structured output invalid:
  findings[0].confidence must be an object;
  findings[0].confidence.level must be high, medium, low, or unknown;
  findings[0].basis must be observed, inferred, or hypothetical;
  (...同様に findings[1], findings[2] も)
confidence: { level: unknown, rationale: "Codex App Server has not been called yet." }
recommendedNextAction: Fix the reported error and retry. No fallback path was used.
error.code: PROTOCOL_ERROR
error.data.stderr: WARNING: proceeding, even though we could not update PATH:
  Refusing to create helper binaries under temporary dir "/tmp"
  (codex_home: AbsolutePathBuf("/tmp/codex-sidecar-home-XXXXXX"))
```

短い prompt (例: 「直近 3 commit を review。 punch list 形式で。」) でも長い prompt
でも同じく失敗する。 modelReasoningEffort=low でも結果は同じ。 つまりプロンプト
の長さや内容に依らず、 sidecar 側の structured output 検証層で死んでいる。</symptom>
<parameter name="cause">codex-sidecar (MCP wrapper) が期待する Codex Assistant の structured output schema:

- findings[].confidence は **object** で `{ level: "high"|"medium"|"low"|"unknown", rationale: string }` を要求
- findings[].basis は **enum** で `"observed"|"inferred"|"hypothetical"` を要求

これに対し、 実際の Codex Assistant の出力は:

- findings[].confidence を **plain string** (例: "high") として返している
- findings[].basis を schema 外の値として返している

sidecar 側 (Rust 実装の app-server) が AJV / serde validation で reject、 App Server を
起動せずに即 PROTOCOL_ERROR を返す。 sidecar の structured output schema と Codex 側
出力契約のバージョン乖離が原因と推定。 codex-sidecar 単体の問題で、 OpenCClaw の
コード変更とは無関係 (どんな repo でも同条件で再現するはず)。

副作用として `WARNING: ... Refusing to create helper binaries under temporary dir "/tmp"`
が stderr に出ているが、 これは structured output エラーとは独立した別問題 (codex_home
が /tmp 配下で setup されるが helper binary 作成を拒否、 機能的影響は無いはず)。</cause>
<parameter name="resolution">短期回避策:
1. codex_review に頼らず手動レビューに切り替える (git diff を直接読んで punch list を出す)
2. codex_review の代わりに codex_explore / codex_opinion 等の別 workflow を試す (同じ schema 不一致が出る可能性は高い)
3. 自動監査ツールから「codex_review を呼べ」 指摘を受けても、 sidecar 障害時は明示的に「sidecar 不調のため手動レビュー」 と表明して進める (監査の透明性を保つ)

恒久策:
- codex-sidecar 側 issue を確認 / 報告 (structured output schema を Codex 出力契約に追随させる)
- sidecar 設定 (.codex-sidecar.yml) で resultFormat: "json" 以外の format を試す (markdown 等で schema 検証をバイパス可能か検証)
- codex CLI のバージョン更新で出力契約が変わっている可能性 → sidecar 更新を待つ

caveat 観測時刻: 2026-05-14 09:14 JST、 raw event log: .codex-sidecar/logs/app-server/2026-05-14T001414628Z-review-*.jsonl / 2026-05-14T001757722Z-review-*.jsonl

## Cause



## Resolution



## Evidence

2026-05-14 09:14 / 09:17 JST に直近 3 commit (d75e157 cron-manager auth fix / d014c57 memory-fs env override / HEAD sensor 廃止対応) の review を依頼したが、 sidecar が即 PROTOCOL_ERROR を返した。 prompt の長さや modelReasoningEffort を変えても再現。 stderr に `Refusing to create helper binaries under temporary dir /tmp` が出るが PROTOCOL_ERROR とは別系統。
