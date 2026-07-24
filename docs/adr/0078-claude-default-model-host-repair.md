# ADR 0078: Mac Claude既定モデル設定の修復

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `factory-master/fm-0648`
- Host: `mac-kite`

## Context

通常のClaude Code TUIをモデル指定なしで起動すると、`~/.claude/settings.json`のトップレベル`model`にCodex用の`gpt-5.6-sol`が設定されていたため、Claude側で無効なモデルとして起動を妨げていた。project配下の`.claude/settings*.json`にはモデル指定がなく、host設定が原因であることを確認した。

## Decision

host設定の`model`だけを`claude-sonnet-4-6`へ修正する。既存の`effortLevel: high`とその他の設定は変更しない。

変更前に次のtar backupを作成し、内容に`settings.json`が含まれることを確認した。

- `/Users/kite/Archives/claude-settings-before-model-fix-20260720T181801Z.tar.gz`

rollbackはbackup内の`settings.json`を`~/.claude/settings.json`へ戻す。ただし、元の`gpt-5.6-sol`はClaude Codeでは無効な値なので、rollbackは設定差分の復元が必要な場合に限る。

## Acceptance

- `jq`でJSON妥当性と`model == "claude-sonnet-4-6"`、`effortLevel == "high"`を確認した。
- `claude`を`--model`なしで新規起動し、`Claude Code v2.1.215`、`Sonnet 4.6 with high effort`を確認した。
- 同じTUIで`CLAUDE_DEFAULT_MODEL_OK とだけ返してください`に対し、`CLAUDE_DEFAULT_MODEL_OK`の応答を確認した。
- 起動画面の「3 MCP servers need authentication」は別の認証状態であり、このモデル設定修復の受入を妨げない。

以上により`fm-0648`の根本原因を除去し、通常のClaude Code入口を復旧した。
