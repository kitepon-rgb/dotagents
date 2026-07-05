# 03_settings-fragments —  各端末 settings.json の推奨断片カタログ

<!-- 前提: 2026-07 時点の Claude Code settings 仕様。機微（トークン・認証情報・個人の絶対パス）はこのファイルに書かない＝リポにコミットしない -->

`~/.claude/settings.json` と各リポの `.claude/settings.json` は端末固有・リポ固有（コミットしない。dotagents の gitignore 済み）。このファイルは「各端末で貼る断片」のカタログであり、適用は手動または skill 経由で行う。

## 読み取り系 Bash の permissions.allow（グローバル推奨）

プロンプト削減の基本セット。破壊系（rm・push・install）は**入れない**——都度確認が正:

```json
{
  "permissions": {
    "allow": [
      "Bash(git fetch:*)", "Bash(git status:*)", "Bash(git log:*)",
      "Bash(git diff:*)", "Bash(git branch:*)", "Bash(git stash list:*)",
      "Bash(ls:*)", "Bash(rg:*)", "Bash(grep:*)", "Bash(find:*)",
      "Bash(wc:*)", "Bash(head:*)", "Bash(tail:*)", "Bash(readlink:*)",
      "Bash(du:*)", "Bash(file:*)", "Bash(which:*)", "Bash(bash -n:*)"
    ]
  }
}
```

## リポ別 allowlist の作り方（正規手順）

手書きせず **fewer-permission-prompts skill** を各リポで実行して生成する（実際のトランスクリプトから頻出読み取りコールを抽出して優先順位つきで提案してくれる）。生成物はそのリポの `.claude/settings.json` に入る＝P3 標準の必須要件。

## hooks の方針

- 自動化（「毎回 X したら Y」）は memory や指示ではなく hooks でしか成立しない——必要になったら update-config skill で settings.json に組む。
- この Mac の実例: caveat の UserPromptSubmit / Stop hook（罠シグナルの提示・セッション状態の退避）。他端末へは caveat MCP 導入（P1 ランブック）とセットで。
- **正本化ゲート hook（全端末推奨・下記）**: プラン承認直後に「計画文書の作法」を注入し、承認プランの docs/ 正本化を機械発火させる。ペイロードは同期される [`../bin/plan-gate-hook.sh`](../bin/plan-gate-hook.sh)（`./install.sh` で `~/.local/bin/plan-gate-hook` へ symlink）、配線だけを各端末の `~/.claude/settings.json` に手挿し（同期ペイロード＋手挿しコネクタ＝settings.json 非同期の型）。設計と TODO は [plan_plan-gate-hook.md](plan_plan-gate-hook.md)。

### 正本化ゲート hook の配線断片

前提: `./install.sh` 済み（`~/.local/bin/plan-gate-hook` が存在）。`~/.claude/settings.json` にマージ（既存 `hooks.PostToolUse` があればその配列へ足す）。ライブ反映＝次のプラン承認から発火:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "ExitPlanMode",
        "hooks": [
          { "type": "command", "command": "~/.local/bin/plan-gate-hook", "timeout": 5 }
        ]
      }
    ]
  }
}
```

- matcher は `ExitPlanMode` 完全一致（プラン承認専用イベントは無く PostToolUse で受ける）。
- TodoWrite には貼らない（些末用途が多く毎回発火は alarm fatigue）。TodoWrite 経路は散文の正本化ゲートがカバー。

## 適用チェック

- 適用後、`/permissions` 相当の UI か新セッションでプロンプト頻度が下がったことを確認。
- allowlist に書いた覚えのないコマンドが増えていたら要調査（設定の出所を必ず特定する）。
