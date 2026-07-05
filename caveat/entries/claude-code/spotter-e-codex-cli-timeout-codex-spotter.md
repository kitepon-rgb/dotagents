---
id: spotter-e-codex-cli-timeout-codex-spotter
title: Spotter の E_CODEX_CLI_TIMEOUT（応答が未監査）は codex 監査ターンの一過性で、Spotter コードのバグではない
visibility: private
confidence: reproduced
outcome: resolved
tags:
  - spotter
  - codex-cli
  - E_CODEX_CLI_TIMEOUT
  - hooks
  - gpt-5.5
  - timeout
  - unaudited
environment:
  os: darwin
  arch: arm64
  node: 26.4.0
  codex_cli: 0.142.3
  codex_model: gpt-5.5
  codex_reasoning_effort: high
  tool: claude-spotter
  spotter_codex_timeout_sec: '45'
source_project: null
source_session: 2026-07-05T10:35:18.904Z/f3f0709959cd
created_at: 2026-07-05
updated_at: 2026-07-05
last_verified: 2026-07-05
---

## Context

Kikoeru セッションで「Spotterに不具合ですか？」の切り分け中に診断。関連ファイル: ~/.codex/config.toml, ~/.codex/hooks.json, .spotter/, claude-spotter/bin/spotter.mjs。

## Symptom

Claude Code の UserPromptSubmit で「Spotter は今回の入力を監査できませんでした (理由コード: E_CODEX_CLI_TIMEOUT) … codex-cli did not respond within 45000ms」が出て、その応答が未監査になる。codex の認証が切れているように見えるが、`codex login status` は "Logged in using ChatGPT" で有効。

## Cause

Spotter（claude-spotter）は入力監査を `codex exec` で1ターン回して実行する。~/.codex/config.toml が model="gpt-5.5" / model_reasoning_effort="high" なので、この監査ターン自体が重い（trivial プロンプトでも実測 ~11.6s、巨大プロンプトの監査ではさらに増大）。加えて ~/.codex/hooks.json の UserPromptSubmit 同期フック3本（throughline/caveat/spotter）が毎回の codex exec に固定オーバーヘッドを載せる。結果、大きい初回プロンプトの監査で 45s の閾値を一過性に割ることがある。Spotter 本体のロジックバグでも認証失効でもなく、Spotter は返らない codex を握りつぶさず fail-loud で surface しているだけ（設計どおり）。

## Resolution

頻発する場合の真レバーは2つで、いずれも Spotter 側設定 .spotter/（gitignore で不可視＝オーナー操作）: (a) Spotter の codex 監査呼び出しの reasoning_effort を下げる or 軽量モデルにする（監査に high 推論は不要）、(b) 監査タイムアウト 45s を引き上げる。一過性なら放置でよい。無関係な hygiene として ~/.codex/config.toml の deprecated `[features].codex_hooks`（後継 hooks=true が既存）は削除で警告だけ消えるが遅延は不変（挙動ゼロ変化・削除後 hooks は3本とも発火継続を実証済み）。別件で hooks.json の SessionStart spotter フックが async:true ＝ codex が async 未対応でスキップ＝未実行だが、これは Spotter インストーラ側で sync フックを吐くべき案件（手で false 化は再インストールで消え得るローカルパッチ）。

## Evidence

同一セッションで実測: (1) `codex login status`=「Logged in using ChatGPT」＝認証有効。(2) `time codex exec 'Reply PONG'`=real 0m11.589s で正常応答。(3) タイムアウト警告が出た直後のターンには未監査警告が付かず監査成功＝一過性。(4) codex exec 出力に UserPromptSubmit フックが×3（throughline/caveat/spotter）走るのを確認。
