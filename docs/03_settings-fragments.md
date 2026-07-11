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
- **正本化ゲート hook（全端末推奨・下記）**: プラン承認直後に「計画文書の作法」を注入し、承認プランの docs/ 正本化を機械発火させる。ペイロードは同期される [`../bin/plan-gate-hook.sh`](../bin/plan-gate-hook.sh)（`./install.sh` で `~/.local/bin/plan-gate-hook` へ symlink）、配線だけを各端末の `~/.claude/settings.json` に手挿し（同期ペイロード＋手挿しコネクタ＝settings.json 非同期の型）。設計と TODO は [archive/2026-07_plan-gate-hook.md](archive/2026-07_plan-gate-hook.md)（完遂済み）。

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

### 呼びかけ hook 群の配線断片（配置ゲート・TODO ゲート・着手ゲート）

前提: `./install.sh` 済み（`~/.local/bin/{delegation-gate-hook,todo-gate-hook,onset-gate-hook}` が存在。`todo-gate-hook` はサブコマンド `session-start` / `stop` を取る）。設計・Hook 台帳・オーナー裁定の正典は [docs/plan_callout-hooks.md](plan_callout-hooks.md)（進行中プラン）。4本とも `~/.claude/settings.json` にマージ（既存配列があればその配列へ足す、無ければ新規作成）。ライブ反映＝配線後の新セッション不要（計画 Phase 1・P5 で hot-reload 実測済み）。

#### C1 配置ゲート（PreToolUse・委譲ツール呼び出し時）

日付付き model ID・`codex_agent` の model/effort 省略・oracle 封印パラメータを deny、`effort:"ultra"` を ask、セッション初回の委譲を warn で呼びかける（[`../bin/delegation-gate-hook.sh`](../bin/delegation-gate-hook.sh)）。

```bash
S=~/.claude/settings.json
MATCHER='Agent|Task|Workflow|mcp__codex-sidecar__codex_.*|mcp__aiterm__(codex|grok|composer)_agent|mcp__oracle__consult'
if ! jq -e --arg m "$MATCHER" '.hooks.PreToolUse[]?|select(.matcher==$m)' "$S" >/dev/null; then
  cp "$S" "$S.bak-delegationgate"                  # バックアップ
  tmp=$(mktemp)
  jq --arg m "$MATCHER" '.hooks.PreToolUse += [{"matcher":$m,"hooks":[{"type":"command","command":"~/.local/bin/delegation-gate-hook","timeout":5}]}]' "$S" > "$tmp" \
    && jq -e . "$tmp" >/dev/null && mv "$tmp" "$S"  # 妥当性を確認してから置換
fi
```

#### C2 TODO 棚卸し（SessionStart・source=startup/clear のみ発火）

docs/ の `plan_*.md`/`queue_*.md` の未消化・archive 未退避をリポ×24h スロットルで想起させる（[`../bin/todo-gate-hook.sh`](../bin/todo-gate-hook.sh) の `session-start` サブコマンド）。

```bash
S=~/.claude/settings.json
if ! jq -e '.hooks.SessionStart[]?.hooks[]?.command | select(.=="~/.local/bin/todo-gate-hook session-start")' "$S" >/dev/null; then
  cp "$S" "$S.bak-todogate-start"
  tmp=$(mktemp)
  jq '.hooks.SessionStart += [{"hooks":[{"type":"command","command":"~/.local/bin/todo-gate-hook session-start","timeout":10}]}]' "$S" > "$tmp" \
    && jq -e . "$tmp" >/dev/null && mv "$tmp" "$S"
fi
```

#### C3 プラン更新忘れ（Stop・rolling baseline で毎ターン判定）

このターンで dirty/コミットの差分があるのに `docs/plan_*.md` が動いていなければ warn（`DOTAGENTS_TODO_GATE=block` で 1 ターン 1 回の block に昇格可）（[`../bin/todo-gate-hook.sh`](../bin/todo-gate-hook.sh) の `stop` サブコマンド）。

```bash
S=~/.claude/settings.json
if ! jq -e '.hooks.Stop[]?.hooks[]?.command | select(.=="~/.local/bin/todo-gate-hook stop")' "$S" >/dev/null; then
  cp "$S" "$S.bak-todogate-stop"
  tmp=$(mktemp)
  jq '.hooks.Stop += [{"hooks":[{"type":"command","command":"~/.local/bin/todo-gate-hook stop","timeout":10}]}]' "$S" > "$tmp" \
    && jq -e . "$tmp" >/dev/null && mv "$tmp" "$S"
fi
```

#### C4 着手ゲート（UserPromptSubmit・毎ターン）

配置宣言（F/A/H ラベル＋02_models.md 該当行の file:line 引用）とプラン正本化を毎ターン思い出させる固定文言（[`../bin/onset-gate-hook.sh`](../bin/onset-gate-hook.sh)）。

```bash
S=~/.claude/settings.json
if ! jq -e '.hooks.UserPromptSubmit[]?.hooks[]?.command | select(.=="~/.local/bin/onset-gate-hook")' "$S" >/dev/null; then
  cp "$S" "$S.bak-onsetgate"
  tmp=$(mktemp)
  jq '.hooks.UserPromptSubmit += [{"hooks":[{"type":"command","command":"~/.local/bin/onset-gate-hook","timeout":5}]}]' "$S" > "$tmp" \
    && jq -e . "$tmp" >/dev/null && mv "$tmp" "$S"
fi
```

#### env による制御

各 hook は環境変数で無効化・昇格できる。**注意**: 実装（2026-07-12 時点のスクリプト本体）を実測した結果、`DOTAGENTS_PLACEMENT_GATE` と `DOTAGENTS_ONSET_GATE` は「`off` かどうか」の2値判定のみで、`off` 以外はどんな値（未設定含む）でも既定動作になる。`DOTAGENTS_TODO_GATE` だけ3値とも分岐が実装されている:

- `DOTAGENTS_PLACEMENT_GATE=off` — C1 を無効化（沈黙）。`off` 以外（未設定含む＝既定）は deny①②③・ask・warn の通常判定が有効。
- `DOTAGENTS_TODO_GATE=off|block`（既定＝未設定は warn） — `off` で C2/C3 を無効化。`block` で C3 を 1 ターン 1 回の Stop block に昇格。それ以外（既定）は warn（additionalContext）。
- `DOTAGENTS_ONSET_GATE=off`（既定＝未設定は毎ターン warn） — `off` で C4 を無効化。`off` 以外は毎ターン注入。

## 適用チェック

- 適用後、`/permissions` 相当の UI か新セッションでプロンプト頻度が下がったことを確認。
- allowlist に書いた覚えのないコマンドが増えていたら要調査（設定の出所を必ず特定する）。
