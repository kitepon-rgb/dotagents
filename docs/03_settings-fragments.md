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
- 実例: caveat の UserPromptSubmit / Stop hook（罠シグナルの提示・セッション状態の退避）。配線は caveat 側の正典に従い、caveat MCP 導入とセットで適用する。
- **Spotter hookは手挿ししない**: 対象projectで `spotter install -y` を実行し、Spotter自身にproject markerとClaude 5 hookを管理させる。PATH上のThroughlineが解決できればauditor contextは既定ON。全projectへglobal発火させる旧`--user`方式はdaemon proliferationを再発させるため非採用。

## Observer parent Stop hook（Claude）

Observerのparent Stop entryは手書きしない。Observer配布済みの`observer-hook-config`からversioned fragmentを取得し、dotagents adapterが既存hookを保ったまま正規化する。既定はdry-runであり、実端末の`--apply`とhook trustはH gateである。

```bash
apply-observer-hook-config --observer-hook "$HOME/.local/bin/observer-parent-stop-hook" \
  --state-root "$HOME/.local/state/observer"
apply-observer-hook-config --apply --observer-hook "$HOME/.local/bin/observer-parent-stop-hook" \
  --state-root "$HOME/.local/state/observer"
apply-observer-hook-config --restore "$HOME/Archives/dotagents-observer-hook-config-<timestamp>.tar.gz"
```

`--state-root`はpreflight、`observer parent ... run`、両providerのStop hookで同じabsolute pathを使う。
省略や既定rootへの暗黙fallbackは認めず、以前のstate rootを持つ同一Observer targetはcanonical一件へ置換する。

`settings.json`が存在しない・空の場合もadapterがobjectとして扱う。symlink、Observer CLI不在、fragment schema不一致、candidate verifier不一致はfail loudであり、既存の他製品Stop hookを削除して補うことはしない。
`--apply`は変更前の存在有無、mode、uid／gidと内容を0600 archiveへ記録し、既存configのmode／ownerを
保持する。`--restore`は同じ`HOME`／`CODEX_HOME`で、symlinkでない本人所有archiveと固定manifest／member
集合を検証してから二設定を原子的に復元する。途中失敗はrestore開始前状態へ戻し、元々absentだったconfigは
削除する。manifest導入前の旧archiveや手製tarをrestoreへ流用しない。

- **計画レーン案内 hook（全端末推奨・下記）**: プラン承認直後に「計画文書の作法」を注入する。レーンの発動条件はグローバル正典「作業レーンと統制」に従う（本書へ条件を複製しない）。ペイロードは同期される [`../bin/plan-gate-hook.sh`](../bin/plan-gate-hook.sh)（`./install.sh` で `~/.local/bin/plan-gate-hook` へ symlink）、配線だけを各端末の `~/.claude/settings.json` に手挿しする。初期設計は [archive/2026-07_plan-gate-hook.md](archive/2026-07_plan-gate-hook.md)、現行のレーン裁定はグローバルCLAUDE.md／AGENTS.mdを正とする。

### 計画レーン案内 hook の配線断片

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
- TodoWrite には貼らない（些末用途が多く毎回発火は alarm fatigue）。通常レーンのTodoWriteから文書作成を要求しない。

### 呼びかけ hook 群の配線断片（配置ゲート・TODO ゲート・着手案内）

前提: `./install.sh` 済み（`~/.local/bin/{delegation-gate-hook,todo-gate-hook,onset-gate-hook}` が存在。`todo-gate-hook` はサブコマンド `session-start` / `stop` を取る）。現行の義務はグローバルCLAUDE.md／AGENTS.md、Hookの実装履歴は [docs/plan_callout-hooks.md](plan_callout-hooks.md) を参照する。4本とも `~/.claude/settings.json` にマージ（既存配列があればその配列へ足す、無ければ新規作成）。ライブ反映＝配線後の新セッション不要（hot-reload 実測済み）。

#### C1 配置ゲート（PreToolUse・委譲ツール呼び出し時）

セッションで最初の委譲を検出した時だけ、配置・委譲契約の正典を案内する短い INFO を返す。引数の検査や deny / ask は行わない。`gpt_connector` の `consult` は相談であって委譲ではないため対象外（[`../bin/delegation-gate-hook.sh`](../bin/delegation-gate-hook.sh)）。

```bash
S=~/.claude/settings.json
MATCHER='Agent|Task|Workflow|mcp__codex-sidecar__codex_.*|mcp__aiterm__(codex|grok|composer)_agent'
if ! jq -e --arg m "$MATCHER" '.hooks.PreToolUse[]?|select(.matcher==$m)' "$S" >/dev/null; then
  cp "$S" "$S.bak-delegationgate"                  # バックアップ
  tmp=$(mktemp)
  jq --arg m "$MATCHER" '.hooks.PreToolUse += [{"matcher":$m,"hooks":[{"type":"command","command":"~/.local/bin/delegation-gate-hook","timeout":5}]}]' "$S" > "$tmp" \
    && jq -e . "$tmp" >/dev/null && mv "$tmp" "$S"  # 妥当性を確認してから置換
fi
```

#### C2 TODO 棚卸し（SessionStart・source=startup/clear のみ発火）

docs/ の `plan_*.md`/`queue_*.md` の未消化・archive 未退避をリポ×24h スロットルで棚卸しし、観測事実と正典への参照だけを INFO で返す（[`../bin/todo-gate-hook.sh`](../bin/todo-gate-hook.sh) の `session-start` サブコマンド）。

```bash
S=~/.claude/settings.json
if ! jq -e '.hooks.SessionStart[]?.hooks[]?.command | select(.=="~/.local/bin/todo-gate-hook session-start")' "$S" >/dev/null; then
  cp "$S" "$S.bak-todogate-start"
  tmp=$(mktemp)
  jq '.hooks.SessionStart += [{"hooks":[{"type":"command","command":"~/.local/bin/todo-gate-hook session-start","timeout":10}]}]' "$S" > "$tmp" \
    && jq -e . "$tmp" >/dev/null && mv "$tmp" "$S"
fi
```

#### Orchestrate advisory（SessionStart・読み取り専用）

active Control、unknown／未回収Run、write conflict、H参照不足、capacity警告だけを、該当時に短い
INFOとして表示する。state変更、H認証、executor/provider/network/cancelは行わず、CLI不在・非git・
timeout・不正snapshot・unsafe cacheでは沈黙する。hookは固定absolute Pythonを`-I`で起動し、親の
`PYTHONPATH`等を解釈しない。既存SessionStart entryを変更せず、次の1件だけ追加する。

```bash
S=~/.claude/settings.json
if ! jq -e --arg home "$HOME" '[.hooks.SessionStart[]?.hooks[]? | select(.type=="command" and .timeout==5 and (.command=="~/.local/bin/orchestrate-advisory-hook" or .command==($home+"/.local/bin/orchestrate-advisory-hook"))] | length == 1' "$S" >/dev/null; then
  cp "$S" "$S.bak-orchestrate-advisory"
  tmp=$(mktemp)
  jq '.hooks.SessionStart += [{"hooks":[{"type":"command","command":"~/.local/bin/orchestrate-advisory-hook","timeout":5}]}]' "$S" > "$tmp" \
    && jq -e . "$tmp" >/dev/null && mv "$tmp" "$S"
fi
```

`DOTAGENTS_ORCHESTRATE_ADVISORY=off`で無効化できる。成功表示後だけsession×repo単位で一度だけ表示し、
hook自身のcache markerは7日後に掃除する。cache baseと`dotagents/hooks`はowner directoryかつsymlink
でないことを検査し、不適合時は作成・変更せず沈黙する。

#### Lattice工程表案内（SessionStart・読み取り専用）

`source=startup|clear`のたびに、Lattice工程表の安定パスとstore上の`active`／`next-ready`を短い
INFOとして表示する。24時間スロットルは掛けない。hookは`lattice todo status`の
`lattice.todo_status_result.v1`だけをstrictに読み、HTMLや`.lattice/todo/`を直接解釈せず、
`lattice todo gantt`も自動実行しない。既存SessionStart entryを変更せず、次の1件だけ追加する。

```bash
S=~/.claude/settings.json
if ! jq -e --arg home "$HOME" '[.hooks.SessionStart[]?.hooks[]? | select(.type=="command" and .timeout==5 and (.command=="~/.local/bin/lattice-gantt-hook session-start" or .command==($home+"/.local/bin/lattice-gantt-hook session-start"))] | length == 1' "$S" >/dev/null; then
  cp "$S" "$S.bak-lattice-gantt"
  tmp=$(mktemp)
  jq '.hooks.SessionStart += [{"hooks":[{"type":"command","command":"~/.local/bin/lattice-gantt-hook session-start","timeout":5}]}]' "$S" > "$tmp" \
    && jq -e . "$tmp" >/dev/null && mv "$tmp" "$S"
fi
```

`lattice` CLIが未導入のgit repoでは無言のno-opにせず、未導入で現在地を案内できない旨をINFO一行で
返す。CLI導入済みで`.lattice/todo/`がないrepo、非git、`resume|compact`はstdout/stderr 0byte・exit 0。
storeが存在するのにtimeout、CLI失敗、不正JSON／schema不一致なら、現在地を取得できない旨をINFO一行で返す。正規statusを取得でき、
`.lattice/generated/gantt.html`がregular fileなら絶対`file://` URIを表示し、未生成なら予定URIと
`lattice todo gantt`の明示実行を案内する。`DOTAGENTS_LATTICE_HOOK=off`で無効化できる。

#### C3 プラン更新忘れ（Stop・rolling baseline で毎ターン判定）

このターンで dirty/コミットの差分があるのに `docs/plan_*.md` が動いていなければ INFO を pending に保存する。Stop 自体には注入せず、次の自然な UserPromptSubmit で C4 が1回だけ配送する（[`../bin/todo-gate-hook.sh`](../bin/todo-gate-hook.sh) の `stop` サブコマンド）。

```bash
S=~/.claude/settings.json
if ! jq -e '.hooks.Stop[]?.hooks[]?.command | select(.=="~/.local/bin/todo-gate-hook stop")' "$S" >/dev/null; then
  cp "$S" "$S.bak-todogate-stop"
  tmp=$(mktemp)
  jq '.hooks.Stop += [{"hooks":[{"type":"command","command":"~/.local/bin/todo-gate-hook stop","timeout":10}]}]' "$S" > "$tmp" \
    && jq -e . "$tmp" >/dev/null && mv "$tmp" "$S"
fi
```

#### C4 着手案内（UserPromptSubmit・セッション初回と compact 後）

作業の進め方をグローバル `CLAUDE.md` / `AGENTS.md` と orchestrate skill へ案内する短い INFO。セッション初回だけ返し、compact 後に1回だけ再案内する。C3 の pending があれば同じ経路で配送する（[`../bin/onset-gate-hook.sh`](../bin/onset-gate-hook.sh)）。

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

各 hook は環境変数で無効化できる。`off` 以外の値（未設定を含む）は既定動作になる:

- `DOTAGENTS_PLACEMENT_GATE=off` — C1 の初回委譲 INFO を無効化。
- `DOTAGENTS_TODO_GATE=off` — C2 の棚卸しと C3 の pending 保存・配送を無効化。旧 `block` 値に特別な昇格動作はない。
- `DOTAGENTS_ONSET_GATE=off` — C4 の初回案内 INFO を無効化。C3 pending の配送は `DOTAGENTS_TODO_GATE` 側で制御する。
- `DOTAGENTS_LATTICE_HOOK=off` — SessionStartのLattice工程表案内を無効化。

## 適用チェック

- 適用後、`/permissions` 相当の UI か新セッションでプロンプト頻度が下がったことを確認。
- allowlist に書いた覚えのないコマンドが増えていたら要調査（設定の出所を必ず特定する）。
