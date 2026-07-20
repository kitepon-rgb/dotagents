# AGENTS.md

このリポで働く**全 AI エージェント共通**のプロジェクト正典（ツール非依存）。Codex・Cursor・Copilot・Gemini CLI・Windsurf 等はこのファイルを読む（[AGENTS.md 標準](https://agents.md/)）。Claude Code は AGENTS.md をネイティブに読まないため、リポ直下 [CLAUDE.md](CLAUDE.md) が `@AGENTS.md` で本ファイルを取り込む（＋ベル固有の追記）。

- **全端末共通憲法・ペルソナ「ベル」**: [shared/constitution.md](shared/constitution.md)（唯一の共通正本）。Claude／Codex固有差分はそれぞれ[claude/CLAUDE.delta.md](claude/CLAUDE.delta.md)／[codex/AGENTS.delta.md](codex/AGENTS.delta.md)、runtimeへ配る[claude/CLAUDE.md](claude/CLAUDE.md)／[codex/AGENTS.md](codex/AGENTS.md)は生成物。
- **趣旨・原則・残件**: [PLAN.md](PLAN.md)（憲章＝聖典 v4）。人間向けの詳細ランブックは [README.md](README.md)。

## このリポジトリの役割

Claude Code と Codex の自作 skill / slash command / rule を複数端末で同期する個人 dotfiles。
`install.sh` がリポジトリ内エントリを `~/.claude/{skills,commands}`、`~/.codex/{rules,agents}`、
Codex の公式 user skill 面 `$HOME/.agents/skills`（明示 legacy 時だけ `~/.codex/skills`）へ
**ファイル / ディレクトリ単位の symlink** で配置する。

そのため:

- リポジトリ内の配布ファイルを編集すれば、選択した配布面の `~/.claude/...` / `~/.codex/...` / `~/.agents/skills/...` に即反映される（symlink なので同じファイル）。グローバル憲法だけは`shared/constitution.md`またはhost deltaを編集後、`node bin/render-global-constitution.mjs --write`で配布生成物を更新する。生成物を直接編集しない。
- `install.sh` は冪等。既存 symlink は上書き、実ファイルが存在する宛先は `SKIP` してログを出す。失敗は止まる (`set -euo pipefail` を維持。フォールバック禁止)。

### 開発工場の定義（所有境界）

- **開発工場そのものはdotagents**。dotagentsを「工場の一部」「司令室だけ」「ServerManagerと並ぶ一方のcontrol plane」と再定義しない。全端末・全projectの規範、導入、更新、親別配線、互換契約、検証、上流追従をここが統括する。
- 工場の現役コア管理対象は計9製品。端末能力を担う8製品（Caveat／Throughline／Spotter／Lattice／MarkItDown／gpt-connector／aiterm-mcp／codex-sidecar）と、中央運用管理を担うServerManagerである。LatticeはCodegraphを完全吸収した正式後継であり、独立Codegraphはretired／not_applicableの履歴だけを保持して現役製品・依存・配線に含めない。Observerは予約・RC4条件付きsupportで未編入。Claude Code CLI／Codex CLI／Grok Buildは別区分の基盤toolchainとして管理し、Oracleはv1互換・rollback専用とする。契約は[導入plan](docs/plan_lattice-factory-integration.md)とLattice `docs/01_integration-package.md`が正。
- **BugHubは独立した第10製品ではなく、ServerManager内部のコンポーネント**。既存の読み取り専用集約、報告元アプリによる重大度決定、`resolve` / `reopen`、`/ai`という契約を守り、8製品のversion・bug・compatibility結果を統括する連携先として活用する。
- 各製品は自身のソース・状態・schema・migration・正規診断を所有する。dotagentsはそれらを複製せず統合契約を所有し、ServerManager/BugHubはdotagentsの代わりに工場方針を決めたり製品状態を直接書き換えたりしない。
- オーナーは、dotagentsの統括AIが**自作コア製品**の正規repoへ必要な修正を行い、version更新、release準備、publish、公開後smokeまで管理することを明示許可している。コア製品の修理・機能追加はcommit/pushで止めず、version bump→publish→対象端末へのglobal install→公開後smoke→公開証跡記録までを同一waveで完遂する。これは責務範囲の恒久裁定であり、第三者製品のfork/patch許可や、本番deploy・credential・意図的障害・registry publish等のH操作に対する目的/影響/rollback説明と実行時承認を省略するものではない。各製品repoの正典・release gate・独立履歴を守る。
- **Codex外部エージェント限界突破**: native Codexの同時枠上限（親を含む）を工場全体の上限にしない。Codex親は`codex-sidecar`とaitermのCodex/Grok/Composerを外部実行レーンとして積極利用し、入れ子Codexを起動してよい。`gpt_connector`は相談レーンであり実装workerではない。委譲の安全・回収・受入契約は[委譲契約](shared/orchestrate/delegation-contract.md)、レーンとexecution-verified資格は[docs/02_models.md](docs/02_models.md)、Codex配線は[docs/05_codex-fragments.md](docs/05_codex-fragments.md)を正とする。
- **工場欠陥は重大度とPhaseで処理する（本リポ固有の恒久裁定）**: コア製品、ServerManager/BugHub、dotagents所有の連携で再現した欠陥のうち、データ損失、security・認可・秘密漏洩、公開契約・履歴破壊、回復不能、現在のcritical pathまたはPhase受入を塞ぐP0/P1だけを即時修理する。非クリティカル欠陥は最小再現・影響・所有repoを既存planのmaintenance queueへ一度記録して本筋を続け、Phaseの通常TODO後、full regression/Phase監査前のmaintenance wave一回で重複統合・再現確認・repo別修理・focused/related gate・repo別commitまで閉じる。欠陥ごとのplan、Control、ADR、独立監査、receiptは作らない。**原因と修理所有者がコア製品、ServerManager/BugHub、dotagentsのいずれにも属さない第三者製品または基盤toolchain本体の欠陥は、dotagentsのToDo、maintenance queue、H承認待ちへ登録せず完全に範囲外とする。** ただしdotagents所有adapter・設定生成・互換projectionの欠陥はdotagents欠陥であり、外部製品名が入力に現れるだけで範囲外へ逃がさない。権限外変更、コア製品のpublish・本番deploy・credential/login・意図的障害試験は、理由と必要条件を記録しH承認待ちとしてcarry overする。
- **ControlのDecision証拠・fixed Worker中の親commit**などControl lifecycleの製品中立規則は[shared/orchestrate/contract.md](shared/orchestrate/contract.md)を正とする（本ファイルへ複製しない）。
- コア製品の追加・削除・第三者化・所有移管は、単なる一覧編集ではない。[README.md](README.md) の「工場コア製品の変更管理」に従い、製品契約、host/connector matrix、更新経路、adapter、BugHub schema/期待matrix、fixture、rollbackを同じ独立waveで更新する。第三者化後はfork・内部patchを止めて公開入口だけを使い、削除時も履歴を消さず、移行中の旧clientでは`not_applicable`へ遷移させてBugHub履歴を保持する。source repoの移動・改名は別途オーナー承認が必要であり、管理区分の変更をその承認の代用にしない。

## AI オンボーディング（この URL を渡された AI へ）

新しい端末でこのリポを稼働させる手順。上から順に実行する。**詳細な前提・トラブルシュートは [README.md](README.md) の「他端末セットアップ・ランブック」（§0〜4）が正典**——本節はその AI 実行用の要約＋`install.sh` が触らない `settings.json` だけを補う。

1. **前提の確認**（README §0）: git identity・node>=22・docker・python3（実行判定 `python3 -c "print(1)"`＝Windows ストア偽エイリアス回避）・基盤CLI（`claude`/`codex`/`grok`）・工場コア8製品（`caveat`/`throughline`/`spotter`/`lattice`/`markitdown`/`gpt-connector`/`aiterm-mcp`/`codex-sidecar-mcp`）を導入し、親別matrixどおり`lattice-mcp`を登録する。独立`codegraph` package／MCP／daemonは導入しない。正規MCP IDは`gpt_connector`、commandは`gpt-connector-mcp`。Oracleは互換・rollback時だけ扱う。
2. **clone**（README §1）: `gh repo clone kitepon-rgb/dotagents ~/Developer/dotagents && cd ~/Developer/dotagents`。
3. **既存実ファイルの退避**（README §2・重要）: install.sh は実ファイルを SKIP するので、先に tar 退避し stale な `~/.claude/CLAUDE.md` 実体を削除。飛ばすと正本化が静かに失敗する。`~/.codex/AGENTS.md` が実ファイルなら同様——中身を確認し、価値ある共通行は`shared/constitution.md`、Codex固有行は`codex/AGENTS.delta.md`へPRし、generatorで配布物を更新してからtar退避・削除する（生成物を直接編集・黙って上書き・破棄しない）。
4. **install → Codex routing / hook 差分確認 → Spotter project install → 検証**（README §3）: 既定の `./install.sh --profile official` 後、`./bin/apply-codex-config.sh --dry-run` で変更範囲を確認する。`--apply` は routing 2キー、dotagents callout hook 4イベント、SessionStart advisory 1件、SessionStart Lattice工程表案内1件だけを backup 付きで書き込むため、対象端末への適用承認後に限る。続けてdotagentsルートで `spotter install -y` を実行し、Spotter自身にproject marker・Claude/Codex hook・host別catalog・Throughline auditor contextを管理させる。最後に `./bin/verify-install.sh --profile official` を通す（FAIL 行が退避すべき実ファイルまたは不足設定を名指しする）。
5. **`settings.json` 断片の適用**（install.sh は `settings.json` を触らない＝ここが手挿しの代替）: 正典・配線断片・実例はすべて [docs/03_settings-fragments.md](docs/03_settings-fragments.md)。AI は jq で「既存確認→バックアップ→追加分のみ→JSON 妥当性確認」の冪等マージを行う。**正本化ゲート hook と呼びかけ hook 4本（C1-C4）は全端末必須**。ライブ反映＝次の発火から有効。
6. **Codex 断片の適用**: 正典は [docs/05_codex-fragments.md](docs/05_codex-fragments.md)（V2 routing 断片必須・`apply-codex-config --apply` の適用範囲契約・routing smoke 手順を含む）。親モデル×effort の既定はオーナー領分（AI は変更しない）。`verify-codex-agent-routing` が green になるまで本作業を渡さない。hook trust の UI 承認は別途 H を要する。
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
| Codex skill | `codex/skills/<name>/` | 既定: `$HOME/.agents/skills/<name>`／明示 legacy: `~/.codex/skills/<name>` | `SKILL.md` を含むディレクトリ (`agents/openai.yaml` 等を併設可)。同一端末・入口には一方だけ |
| Codex rule | `codex/rules/<file>` | `~/.codex/rules/<file>` | 任意ファイル (例: `default.rules`) |
| Codex グローバル規範 | 正本: `shared/constitution.md`＋`codex/AGENTS.delta.md`／生成物: `codex/AGENTS.md` | `~/.codex/AGENTS.md` | generatorで合成する単一 `.md`（詳細は「含めないもの」節） |
| Codex サブエージェント | `codex/agents/<name>.toml` | `~/.codex/agents/<name>.toml` | 単一 `.toml`（`name`/`description`/`developer_instructions` の3必須キー） |
| 実行スクリプト | `bin/<name>.sh` / `bin/<name>.mjs` | `~/.local/bin/<name>` | shebang に従う単一実行スクリプト（bash / Python / Node.js。拡張子は配置時に外れる、`chmod +x` 必須） |

`install.sh` は上記の配布対象を 1 階層だけ走査し symlink を張る。Codex skill 面は `--profile official|legacy` の一方だけを選ぶ。**新規エントリ追加後は `./install.sh --profile <面>` を再実行が必要** (既存エントリの編集だけなら不要)。

### Skill の frontmatter (Anthropic 規約)

`SKILL.md` の冒頭には YAML frontmatter で `name` と `description` を書く。`description` は **Claude がいつこの skill を起動するかの判定材料**になるため、「〜と頼まれた時に使う」「Use when …」のような起動条件として書く。例:

```yaml
---
name: auto-deploy-on-push
description: GitHub push 起点のデプロイを安全に検討する時に使う。
---
```

### Command の frontmatter

`description` 必須、`argument-hint` は任意。`$ARGUMENTS` でコマンド引数を本文に差し込める (`claude/commands/polish-github.md` 参照)。

## 含めないもの (リポジトリに置かない)

- `~/.claude/skills/learned/` — 自動学習で増減するため端末ローカル
- `~/.claude/{settings.json,plugins,projects,sessions}` — 端末固有 / 認証情報（端末メモリ `projects/*/memory` を含む。設定の推奨断片は [docs/03_settings-fragments.md](docs/03_settings-fragments.md)）
- `~/.codex/{config.toml,auth.json,sessions,*.sqlite}` — 同上
- `~/.codex/skills/.system/` — Codex CLI バンドルのシステム skill
- ~~`~/.codex/AGENTS.md`~~ — 2026-07 にリポ正本化（共通正本＋Codex deltaから作る[生成物](codex/AGENTS.md)をsymlink配布。本ファイル＝リポ直下 AGENTS.md＝プロジェクト単位の正典とは別物・混同しない）。端末ローカルの緊急上書きは `~/.codex/AGENTS.override.md`（非コミット。存在すれば Codex が配布憲法より優先して読むため、`bin/verify-install.sh` が非空を FAIL 名指しする）
- リポ直下の `.claude/` `.vscode/` — 端末固有状態 (Throughline が端末の絶対パスを焼き込む)。gitignore 済み

## ビルド / テスト / 検証

ビルドは無し。`install.sh` 自身は `bash -n install.sh` で構文チェックのみ可能。静的 lint は `make lint`、CI と同一の完全ゲートは `make ci`（Codex CLI を使う隔離 HOME test を含む。正典 [docs/04_ci.md](docs/04_ci.md)）。構成（エントリの追加・削除・改名）を変えたら:

1. `./install.sh` を再実行し、期待どおりの `linked:` / `SKIP` が出ること
2. `ls -la ~/.claude/skills ~/.claude/commands ~/.agents/skills ~/.codex/rules`（legacy 選択時は `~/.codex/skills`）で link 先が本リポを向いていること
3. 新しい Claude Code / Codex セッションでスキル・コマンドが一覧に出ること

## 自動アップデート

`bin/agents-update.sh` が curated な NPM ツール群 (Claude Code / Codex CLI / aiterm-mcp / Codex Sidecar / pnpm ほか) を `npm install -g <pkg>@latest` で順次更新する。`install.sh` で `~/.local/bin/agents-update` に symlink される。**週次の常設は必須**（macOS=launchd／Linux・WSL=cron。手順と「旧自動更新の撲滅」は [README.md](README.md)「自動アップデート」節が正典）。**対象パッケージ一覧はスクリプト先頭の `PACKAGES=` を直接編集**。`npm link` / `npm install -g .` 中の package をリストに残したまま走らせると registry 版で上書きされる点だけ注意。

工場コア8製品は「導入済み」で終わらない。NPM製品は `@latest`、MarkItDownは `uv tool upgrade` で更新し、更新後も `verify-install` と `make ci` の互換契約を維持する。失敗した製品名を明示して更新ジョブを非0終了させ、上流更新でCLI・hook・MCP・設定schemaが変わった時は、製品側の正規契約を確認してdotagentsのadapter・ランブック・fixtureを同じ作業で追従させる。

## 既知の罠

- **旧 clone パスは `~/projects/dotagents`（消滅）**。2026-05 以前に設置した symlink が旧パス向きで残っている端末がありうる。`./install.sh` 再実行で貼り直す。
- **Codex skill 面を同居させない**: `$HOME/.agents/skills` と `~/.codex/skills` の同名 skill は selector に二重出現しうる。通常は公式 profile、旧入口だけ `--profile legacy` を明示し、`verify-install` の重複 FAIL を解消してから新規 session を開く。
- **Throughline 管理物と衝突しない**: `sc-detail` / `tl` / `tl-trim` コマンドは Throughline が端末側で実ファイル生成するためリポから除去済み (3cdff89)。再収録しない。`~/.codex/skills/throughline` も同様に端末側実ディレクトリが管理する——repo 版は 2026-07-04 の資産棚卸しで**廃止済み**（どの端末でも shadow され未使用の死荷重だった）。こちらも再収録しない。
