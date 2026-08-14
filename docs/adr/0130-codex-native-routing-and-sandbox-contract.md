# ADR 0130: Codex native routing gate と sandbox 表示契約

- Status: Accepted
- Date: 2026-08-14
- Lattice: `codex-full-support` / `cf-0154`

## Decision

Codex native sub-agent の routing smoke と `verify-codex-agent-routing` は、Control 配下の書込み Worker だけに適用する。通常の native audit、refuter、sorter は spawn 時に本任務を直接渡し、事前 smoke を要求しない。

Control 配下の書込み Worker は、spawn が返した canonical task name `/root/...` と rollout の `agent_path` を厳密一致で検証する。現行で再現しない UUID-only / `agent_path=null` を推測で支える schema 移行、最新 rollout fallback、ID/path の曖昧探索は導入しない。canonical handle を検証できない runtime では明示失敗する。

custom agent の実効 sandbox は親 turn の permission profile を継承する。role TOML には強制不能な `sandbox_mode` を置かず、refuter / sorter の書込み禁止は行動契約として明示する。verifier は実効 sandbox を観測表示するが、role 別の期待値、警告、厳格化フラグを持たない。

Claude の routing、permission、skill 契約は変更しない。

## Evidence

- macOS と WSL2 Codex CLI 0.147.0 は、ともに canonical task name `/root/...` を返し、rollout の `agent_path` と一致した。報告時の UUID-only / `agent_path=null` は再現しなかった。
- WSL2 新規親:
  - 通常 refuter を事前 smoke なしで実行し、`/root/wsl_direct_refuter` から `DIRECT_OK:dotagents` を回収した。
  - implementer を handshake-only で起動し、`/root/wsl_control_writer_probe` の verifier が exit 0。`gpt-5.6-terra / medium / workspace-write`、`sandbox_contract=observed-only`、WARNなしを確認後、同じhandleから `CONTROL_OK:dotagents` を回収した。
- macOS 新規親:
  - read-only 親で通常 refuter を事前 smoke なしで実行し、`/root/mac_direct_refuter` から `DIRECT_OK:dotagents` を回収した。
  - read-only 親では verifier の here-document 一時ファイル作成が OS に拒否され exit 1。本作業follow-upは行わず、不成立を成功へ丸めなかった。
  - 通常権限の新規親では `/root/mac_control_writer_probe2` の verifier が exit 0。`gpt-5.6-terra / medium / danger-full-access`、`sandbox_contract=observed-only`、WARNなしを確認後、同じhandleから `CONTROL_OK:dotagents` を回収した。
- Grok 4.6×high の敵対的検証は P0/P1 なし。P2 の README 旧手順1件を修正し、同一sessionの再確認で残指摘なし。
- focused / related gate:
  - `tests/orchestrate/agent-routing-verifier.sh`: OK
  - `tests/skills/smoke.sh`: OK
  - `tests/orchestrate/executor-adapters.test.mjs`: 23/23 pass
  - `make lint`: pass
  - `bin/verify-install.sh --profile official`: OK
  - `make ci`: pass
- WSL2 と macOS の受入後 `git status --short` は空。Claude配布面を含む最終CIもgreen。

## Consequences

- 旧 UUID-only runtime の Control書込みWorkerは引き続き明示失敗するが、通常のnative監査・分類を巻き添えにしない。
- role名の「読み取り専用」はOS強制を意味しない。実効権限の境界は親sandbox、書込み禁止はroleの行動契約である。
- read-only親でshell自体が一時ファイルを作れない場合、verifierは実行不能として失敗する。別rolloutや別IDへfallbackしない。
