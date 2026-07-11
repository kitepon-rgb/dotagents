# AGENTS.md

このリポで働く**全 AI エージェント共通**のプロジェクト正典（ツール非依存）。Codex・Cursor・Copilot・Gemini CLI・Windsurf 等はこのファイルを読む（[AGENTS.md 標準](https://agents.md/)）。Claude Code は AGENTS.md をネイティブに読まないため、リポ直下 [CLAUDE.md](CLAUDE.md) が `@AGENTS.md` で本ファイルを取り込む（＋ベル固有の追記）。

- **全端末憲法・Claude ペルソナ「ベル」**: [claude/CLAUDE.md](claude/CLAUDE.md)（グローバル `~/.claude/CLAUDE.md` の正本。本ファイルより上位の振る舞い正典）。
- **趣旨・原則・残件**: [PLAN.md](PLAN.md)（憲章＝聖典 v4）。人間向けの詳細ランブックは [README.md](README.md)。

## このリポジトリの役割

Claude Code と Codex の自作 skill / slash command / rule を複数端末で同期する個人 dotfiles。
コードは無く、`install.sh` がリポジトリ内エントリを `~/.claude/{skills,commands}` と
`~/.codex/{skills,rules}` 配下に **ファイル / ディレクトリ単位の symlink** で配置する。

そのため:

- リポジトリ内のファイルを編集すれば即 `~/.claude/...` / `~/.codex/...` に反映される (symlink なので同じファイル)。逆方向も同じ。
- `install.sh` は冪等。既存 symlink は上書き、実ファイルが存在する宛先は `SKIP` してログを出す。失敗は止まる (`set -euo pipefail` を維持。フォールバック禁止)。

## AI オンボーディング（この URL を渡された AI へ）

新しい端末でこのリポを稼働させる手順。上から順に実行する。**詳細な前提・トラブルシュートは [README.md](README.md) の「他端末セットアップ・ランブック」（§0〜4）が正典**——本節はその AI 実行用の要約＋`install.sh` が触らない `settings.json` だけを補う。

1. **前提の確認**（README §0）: git identity・node>=22・docker・python3（実行判定 `python3 -c "print(1)"`＝Windows ストア偽エイリアス回避）・`claude`/`codex`/`markitdown`・MCP 用 CLI（`aiterm-mcp`/`caveat`/`codegraph`/`codex-sidecar-mcp`）を導入し `claude mcp add --scope user` で登録（codex-sidecar は Claude 側のみ＝Codex 親はネイティブ委譲一択。2026-07-11 監査で登録漏れ実在＝憲法の「ツール一覧に常在」が空手形化していた）。
2. **clone**（README §1）: `gh repo clone kitepon-rgb/dotagents ~/Developer/dotagents && cd ~/Developer/dotagents`。
3. **既存実ファイルの退避**（README §2・重要）: install.sh は実ファイルを SKIP するので、先に tar 退避し stale な `~/.claude/CLAUDE.md` 実体を削除。飛ばすと正本化が静かに失敗する。`~/.codex/AGENTS.md` が実ファイルなら同様——中身を確認し、価値ある行は `codex/AGENTS.md` へ PR してから tar 退避・削除する（黙って上書き・破棄しない）。
4. **install → Codex routing 必須断片 → 検証**（README §3）: `./install.sh` 後、`~/.codex/config.toml` の `[features.multi_agent_v2]` に `hide_spawn_agent_metadata = false` と `tool_namespace = "agents"` を冪等適用してから `./bin/verify-install.sh`。verify が OK を返すまで直す（FAIL 行が退避すべき実ファイルまたは不足設定を名指す）。
5. **`settings.json` 断片の適用**（install.sh は `settings.json` を触らない＝ここが手挿しの代替。AI は jq で冪等・安全にマージせよ）: 正典は [docs/03_settings-fragments.md](docs/03_settings-fragments.md)。手順＝既存確認→バックアップ→追加分のみ→JSON 妥当性確認。**正本化ゲート hook は全端末必須**。実例（hook を PostToolUse に冪等追記）:

   ```bash
   S=~/.claude/settings.json
   if ! jq -e '.hooks.PostToolUse[]?|select(.matcher=="ExitPlanMode")' "$S" >/dev/null; then
     cp "$S" "$S.bak-planhook"                       # バックアップ
     tmp=$(mktemp)
     jq '.hooks.PostToolUse += [{"matcher":"ExitPlanMode","hooks":[{"type":"command","command":"~/.local/bin/plan-gate-hook","timeout":5}]}]' "$S" > "$tmp" \
       && jq -e . "$tmp" >/dev/null && mv "$tmp" "$S" # 妥当性を確認してから置換
   fi
   ```

   他の推奨断片（読み取り系 `permissions.allow` 等）も [docs/03_settings-fragments.md](docs/03_settings-fragments.md) 参照。ライブ反映＝次の発火から有効。
6. **Codex 断片の適用**: 正典は [docs/05_codex-fragments.md](docs/05_codex-fragments.md)。custom agent の `[agents.<name>]` 個別登録は不要だが、step 4 の V2 routing 断片は必須。親モデル×effort の既定はオーナー領分（AI は変更しない）。新規セッションで `agent_type` が schema に出ることを確認し、`agent_type=<role>`＋`fork_turns="none"` の handshake-only spawn 後、`verify-codex-agent-routing` が green になるまで本作業を渡さない。
7. **メモリ整理・自動アップデート常設**（README §4・「自動アップデート」節）: 各端末のメモリ整理と週次 `agents-update`（macOS=launchd／Linux・WSL=cron）を必須で設置。

## 掟（複数端末リポの作法）

1. **作業前に必ず `git fetch` → origin/main と照合**してから触る。このリポは複数端末から編集される。作業後は必ず push で真実を返す（GitHub が真実の源）。
2. **dirty を見つけたら差分から意図を確認**してから収容（コミット）か破棄を判断する。symlink 運用ゆえ、`~/.claude` / `~/.codex` 側での編集がこのリポの dirty として現れる。勝手に checkout で消さない。
3. **趣旨・原則・残件は [PLAN.md](PLAN.md)（憲章＝聖典 v4）が正**。文書は3分類で管理する——①趣旨 ②プラン（docs/ に作り **TODO を兼ねる**） ③役目を終えたら [docs/archive/](docs/archive/) へ退避。環境まわりの作業はまず PLAN.md の残件と docs/ の進行中プランで現在地を拾い、判断に迷ったら原則に立ち返る。調査の前に [rag/INDEX.md](rag/INDEX.md) と caveat を検索する（同じ調査を繰り返さない）。

## 配置規約

| 種類 | リポジトリ上の場所 | 配置先 | 形式 |
|---|---|---|---|
| Claude skill | `claude/skills/<name>/` | `~/.claude/skills/<name>` | `SKILL.md` 必須のディレクトリ |
| Claude command | `claude/commands/<name>.md` | `~/.claude/commands/<name>.md` | 単一 `.md` |
| Codex skill | `codex/skills/<name>/` | `~/.codex/skills/<name>` | `SKILL.md` を含むディレクトリ (`agents/openai.yaml` 等を併設可) |
| Codex rule | `codex/rules/<file>` | `~/.codex/rules/<file>` | 任意ファイル (例: `default.rules`) |
| Codex グローバル規範 | `codex/AGENTS.md` | `~/.codex/AGENTS.md` | 単一 `.md`（2026-07 リポ正本化。詳細は「含めないもの」節） |
| Codex サブエージェント | `codex/agents/<name>.toml` | `~/.codex/agents/<name>.toml` | 単一 `.toml`（`name`/`description`/`developer_instructions` の3必須キー） |
| 実行スクリプト | `bin/<name>.sh` | `~/.local/bin/<name>` | 単一 bash (`.sh` は配置時に外れる、`chmod +x` 必須) |

`install.sh` は上記 7 グループのそれぞれを 1 階層だけ走査し symlink を張る。**新規エントリ追加後は `./install.sh` を再実行が必要** (既存エントリの編集だけなら不要)。

### Skill の frontmatter (Anthropic 規約)

`SKILL.md` の冒頭には YAML frontmatter で `name` と `description` を書く。`description` は **Claude がいつこの skill を起動するかの判定材料**になるため、「〜と頼まれた時に使う」「Use when …」のような起動条件として書く。例:

```yaml
---
name: audit-gauntlet
description: 計画書・仕様書・設計書を 3 段関門で磨き込む。「磨いて」「叩いて」と頼まれた時に使う。
---
```

### Command の frontmatter

`description` 必須、`argument-hint` は任意。`$ARGUMENTS` でコマンド引数を本文に差し込める (`claude/commands/polish-github.md` 参照)。

### Command を Skill の薄いラッパとして提供するパターン

スラッシュコマンド本文と skill 本文が完全に同じになるなら、コマンド側を skill の `SKILL.md` への相対 symlink にして二重管理を避ける。実例:

```
claude/commands/audit-gauntlet.md -> ../skills/audit-gauntlet/SKILL.md
```

## 含めないもの (リポジトリに置かない)

- `~/.claude/skills/learned/` — 自動学習で増減するため端末ローカル
- `~/.claude/{settings.json,plugins,projects,sessions}` — 端末固有 / 認証情報（端末メモリ `projects/*/memory` を含む。設定の推奨断片は [docs/03_settings-fragments.md](docs/03_settings-fragments.md)）
- `~/.codex/{config.toml,auth.json,sessions,*.sqlite}` — 同上
- `~/.codex/skills/.system/` — Codex CLI バンドルのシステム skill
- ~~`~/.codex/AGENTS.md`~~ — 2026-07 にリポ正本化（[codex/AGENTS.md](codex/AGENTS.md) → symlink 配布。本ファイル＝リポ直下 AGENTS.md＝プロジェクト単位の正典とは別物・混同しない）。端末ローカルの緊急上書きは `~/.codex/AGENTS.override.md`（非コミット。存在すれば Codex が配布憲法より優先して読むため、`bin/verify-install.sh` が非空を FAIL 名指しする）
- リポ直下の `.claude/` `.vscode/` — 端末固有状態 (Throughline が端末の絶対パスを焼き込む)。gitignore 済み

## ビルド / テスト / 検証

ビルドは無し。`install.sh` 自身は `bash -n install.sh` で構文チェックのみ可能。lint ゲートは `make lint`（shellcheck＋markdownlint。正典 [docs/04_ci.md](docs/04_ci.md)）。構成（エントリの追加・削除・改名）を変えたら:

1. `./install.sh` を再実行し、期待どおりの `linked:` / `SKIP` が出ること
2. `ls -la ~/.claude/skills ~/.claude/commands ~/.codex/skills ~/.codex/rules` で link 先が本リポを向いていること
3. 新しい Claude Code / Codex セッションでスキル・コマンドが一覧に出ること

## 自動アップデート

`bin/agents-update.sh` が curated な NPM ツール群 (Claude Code / Codex CLI / aiterm-mcp / Codex Sidecar / pnpm ほか) を `npm install -g <pkg>@latest` で順次更新する。`install.sh` で `~/.local/bin/agents-update` に symlink される。**週次の常設は必須**（macOS=launchd／Linux・WSL=cron。手順と「旧自動更新の撲滅」は [README.md](README.md)「自動アップデート」節——2026-07-04 実測で旧 tools-manager 製の週次更新が別リストで並走していた）。**対象パッケージ一覧はスクリプト先頭の `PACKAGES=` を直接編集**。`npm link` / `npm install -g .` 中の package をリストに残したまま走らせると registry 版で上書きされる点だけ注意。

## 既知の罠

- **旧 clone パスは `~/projects/dotagents`（消滅）**。2026-05 設置の symlink が旧パス向きで宙ぶらりんの端末がある（この Mac で実測）。`./install.sh` 再実行で貼り直す。
- **Throughline 管理物と衝突しない**: `sc-detail` / `tl` / `tl-trim` コマンドは Throughline が端末側で実ファイル生成するためリポから除去済み (3cdff89)。再収録しない。`~/.codex/skills/throughline` も同様に端末側実ディレクトリが管理する——repo 版は 2026-07-04 の資産棚卸しで**廃止済み**（どの端末でも shadow され未使用の死荷重だった）。こちらも再収録しない。
