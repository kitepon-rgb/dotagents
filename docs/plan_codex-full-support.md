# dotagents Codex 全対応計画

作成: 2026-07-12
状態: 実装中（オーナー GO: 2026-07-12、Wave 2 の安全実装とこの Mac の official 面移行を検証済み。他端末確定・新規 session E2E 待ち）

## 0. 目的

dotagents を全端末の開発工場の中心として、Claude Code と Codex のどちらを親にしても同じ工場原則・主要 workflow・委譲品質・端末再現性を得られる状態にする。

「全対応」はファイル数の左右対称ではなく**能力対称**を指す。製品固有機能は無理に移植せず、`対応 / 製品固有 / 非採用（理由）` のいずれかを明記できれば閉じる。

## 1. 完了条件（本計画が TODO を兼ねる）

- [ ] Codex の9面（AGENTS_MD / CONFIG / SKILLS / PLUGINS / MCP_SERVER_CONFIG / SUBAGENTS / HOOKS / COMMANDS / SESSIONS）に未裁定行がない
- [ ] Claude の主要 workflow 3件に Codex の正規入口があり、Claude 固有ツールを誤って呼ばない
- [ ] Codex の公式 user skill 面 `$HOME/.agents/skills` から対象 skill を利用できる
- [ ] 規範・skills・subagents・hooks・必須 MCP・session 継続を新規 Codex session で実測済み
- [ ] 現役端末すべてで clone/pull→install→必須設定→verify→代表 E2E が green
- [ ] Claude 側の skill/command/agent/hook に回帰がない
- [ ] 既存 Codex 関連プランの重複 TODO を完了または移管理由付きで閉じている
- [ ] 最終反証・CI・push を終え、本ファイルを `docs/archive/` へ移している

## 2. 根拠

公式仕様と端末実測の再利用正本は [rag/codex/codex-full-support-foundations.md](../rag/codex/codex-full-support-foundations.md)。確定事項:

- Codex の external-agent import は9面を区別する。この9面を監査軸にする。
- 公式 user skill 面は `$HOME/.agents/skills` で、symlink は正式対応。
- この端末の Codex CLI 0.144.1 は legacy の `~/.codex/skills` も読む。公式面と同時に置くと同名重複しうるため、端末×入口ごとに公式/legacy のどちらか一意な面を選ぶ。
- `/import` はコピー型で既存 skill を上書きしない。同期には使わず、`detect` を差分確認にだけ使う。
- plugin の hook 対応は公式ページ・ローカル manifest validator・creator skill の間で不整合がある。今回の配布基盤には採用しない。

調査時、`openai-docs` の Codex manual helper は公式応答の `x-content-sha256` 欠落で失敗した。失敗を隠さず、OpenAI Developer Docs MCP で必要な公式箇所を取得して `rag/codex/` へ保存した。

## 3. 現状と裁定

| 面 | 現状 | 本計画の裁定 |
|---|---|---|
| AGENTS_MD | ルート `AGENTS.md`、Claude/Codex グローバル正典、共通章 parity あり | 対応済み。サイズ上限・override shadow を最終 E2E で再確認 |
| CONFIG | `docs/03`・`docs/05` に断片、端末適用は手動 | 必須キーと dotagents hook だけ安全に適用・検証できるようにする |
| SKILLS | Claude 3件、Codex 3件。Codex `orchestrate` は Claude 本文丸ごと symlink | `orchestrate` を製品別入口へ分け、`audit-gauntlet` と `auto-deploy-on-push` を Codex 化 |
| PLUGINS | repo 内 manifest/marketplace なし | **非採用**。個人git+symlink配布を二重化するため今回の完了条件外 |
| MCP_SERVER_CONFIG | Claude 登録手順が中心。Codex は一部断片のみ | 親別の必須/任意/禁止 matrix と Codex 登録・疎通手順を追加 |
| SUBAGENTS | Codex 3 role、routing verifier、現端末 smoke あり | 基盤は対応済み。native audit 追加と他端末 E2E だけ |
| HOOKS | Claude C1-C4 / Codex X1-X5 は正典参照の短い INFO。初回案内・compact 再武装・Stop pending 配送を smoke 済み | INFO 契約を再設計しない。CI 昇格、README、他端末実火だけ |
| COMMANDS | Claude command 3件、Codex 対応表なし | Codex は対応 skill の明示 invocation を正規入口にする。架空の plugin command は作らない |
| SESSIONS | Throughline と handoff smoke が端末外で実装済み | 新規実装しない。dotagents は配線存在と代表 capture/restore/handoff を受け入れ検証 |
| 配布/CI | `~/.codex/skills` のみ。clean HOME E2E なし | 公式 skill 面を追加し、repo配布CIと実端末 E2Eを分離 |

## 4. 設計方針

1. **能力対称、実装は製品固有**: Claude Workflow と Codex native subagent を同じ実行本文へ押し込まない。
2. **全面移動はしない**: 既存ディレクトリを `shared/` へ一括移動しない。まず `orchestrate` の製品中立契約だけを共通 reference として抽出し、再利用が実証された範囲だけ後から広げる。
3. **入口は小さく、契約は一つ**: Claude/Codex の `SKILL.md` は各製品の入口を持ち、F/A/H・反証・委譲契約など共通部分は同じ reference を読む。
4. **既存安全網を育てる**: 新しい全資産 manifest や汎用診断器を増やさず、`install.sh`・`verify-install.sh`・既存 smoke・README 対応表を正本にする。
5. **公式面を既定、legacy は明示互換**: `$HOME/.agents/skills` を既定にする。古い入口だけ explicit legacy profile を使い、同じ入口へ両面を常設しない。dotagents 所有の旧 symlink を外す時は dry-run・backup・H承認を必須にし、他の local skill は触らない。
6. **端末設定は狭く扱う**: model、permissions、OAuth、hook trust を自動変更しない。自動適用は routing 必須2キーと dotagents 固有 hook entry の追加だけ。
7. **一波一責務**: 各 wave は独立 commit、フルゲート、個別 revert が可能な単位にする。

## 5. Workflow 対応表

| 能力 | Claude 入口 | Codex 入口 | 実装方針 |
|---|---|---|---|
| orchestrate | `claude/skills/orchestrate` | `codex/skills/orchestrate` | 丸ごと symlink を廃止。共通契約＋Claude appendix＋Codex native appendix |
| audit-gauntlet | skill + command | 新規 Codex skill | Find→Dedup→existence/value反証→Critic を native subagent で再現 |
| auto-deploy-on-push | skill + command | 新規 Codex skill | 承認・安全・検証契約を共通化し、Codex shell/agent 入口へ翻訳 |
| polish-github | Claude command | 既存 Codex skill | 既存正本参照を確認し、変更は差分がある場合だけ |
| oracle | Claude MCP | 既存 Codex skill + MCP | API key禁止・封印条件を維持し、入口差だけ文書化 |

暗黙 invocation は非決定的なので全件×複数回を完了条件にしない。frontmatter 静的検証、全件の明示 invocation、代表 skill の暗黙 invocation を新規 session で確認する。

## 6. 実装 Wave

### Wave 0 — ベースラインと有限化（挙動不変）

- [ ] 現役端末×Codex入口（desktop / CLI / IDE 等）をオーナーと確定し、存在しない端末・入口を推測で追加しない
- [x] `git fetch`、ahead/behind、dirty、stash を記録
- [x] `make lint`、Claude/Codex hook smoke、`install.sh`、`verify-install.sh` を green にする。hook baseline は初回 INFO・同セッション2回目沈黙・compact 後1回再武装・Stop pending の次回1回配送・deny/ask/block 不在を保存
- [x] `/import` または `externalAgentConfig/detect` を**検出だけ**実行し、9面の差を保存（import禁止）
- [ ] 各現役入口の新規 Claude/Codex session で skills・agents・MCP・hooks baseline を保存
- [x] AGENTS の実効 byte budget と、人格・計画・F/A/H・git・報告の先頭/末尾カナリアが実読されることを保存
- [x] README に9面の小さな対応表を追加（配布対象だけ。docs/rag/bin全件の第三台帳は作らない）
- [x] rollback: Wave 0 の文書・baseline 差分だけを独立 commit とし、その commit 単位で revert

### Wave 1 — 実在する Workflow ギャップを閉じる（能力追加）

- [x] `orchestrate` の共通契約 reference を追加（既存ディレクトリの移動・改名なし）
- [x] Claude 入口を Claude Workflow/外部枠 appendix として整理
- [x] Codex の symlink adapter を製品固有 skill ディレクトリへ置換し、native agents/routing を使う
- [x] `audit-gauntlet` Codex skill を追加し、2票反証と件数遷移を fixture で検証
- [x] `auto-deploy-on-push` Codex skill を追加し、高リスク操作の説明・H承認・rollback を固定
- [x] `polish-github`・`oracle` は既存対応との差分監査のみ。必要がなければ「変更なし」を記録
- [x] Claude command 3件→Codex skill 入口の対応表を README に追加
- [ ] 全対象 skill の frontmatter、明示 invocation、代表暗黙 invocation を新規 session で確認
- [x] rollback: Wave 1 を独立 commit とし、revert で旧 orchestrate symlink を復元可能にする

### Wave 2 — 配布・Config・MCP・継続の再現性（能力追加）

- [x] `install.sh` が Codex skill を公式 `$HOME/.agents/skills` へ既定で symlink 配布
- [x] 古い入口用に explicit legacy profile を用意し、通常実行で公式/legacy を同時配布しない
- [ ] 移行 probe で同名重複と優先順位を実測し、各入口が一つの面だけから同一 canonical content を読む状態を合格条件にする
- [ ] dotagents 所有の旧 legacy symlink は dry-run一覧→backup→H承認後に対象限定で外し、他の local skill を保存（この Mac は完了、他端末は一覧確定後）
- [x] `verify-install.sh` が選択 profile、公式面/legacy面、リンク先、重複、`AGENTS.override.md` shadow を区別して検証
- [x] clean temporary HOME で repo配布と静的設定 fixture を検証する CI を追加
- [x] Claude/Codex hook smoke を `make lint` / GitHub Actions の明示ゲートへ昇格し、初回 INFO・2回目沈黙・compact 再武装・pending 1回配送・旧 deny/ask/block 不在を固定
- [x] 既存 `verify-install.sh` を読み取り診断の唯一の入口として維持（別の汎用 check tool は作らない）
- [x] routing 必須2キーと dotagents hook entry だけを、backup→dry-run→冪等追加できる適用スクリプトを追加
- [x] model、permissions、既存他tool hooks、OAuth、trust は変更せず、診断＋H手順に残す
- [x] 親別 MCP matrix を作成
  - Claude 親: codex-sidecar、aiterm、caveat、codegraph、oracle
  - Codex 親: native subagents、aiterm（Grok/Composer用）、caveat、codegraph、oracle/OpenAI Docs
- [x] `codex mcp` の登録・list・疎通、STDIO env closed-mode、必須/任意/親で禁止をランブック化
- [ ] Throughline/codex-thread-handoff-smoke の代表 capture/restore/handoff を実測（本体改造・sessions同期はしない。capture/handoff は成功、restore は上流 mismatch で未達）
- [x] 既存 `docs/05` の max_threads 非設定契約を維持し、max_depth/fan-out は実在確認後に必要分だけ追記
- [x] rollback: 追加 symlink と設定追記だけを戻し、端末バックアップから復元可能にする

#### Wave 2 の安全実装・実測（2026-07-12）

- 隔離 temporary HOME で `install.sh --profile official`、symlink 経由の `apply-codex-config --dry-run/--apply`、`verify-install --profile official`、Codex `debug prompt-input` を通した。対象5 skill（`audit-gauntlet` / `auto-deploy-on-push` / `oracle` / `orchestrate` / `polish-github`）がリポの公式 skill 面を読んだ。
- `make ci` は `make lint` と clean HOME の profile / config / rollback fixture を連結する。CI は `@openai/codex@0.144.1` を明示導入し、macOS/BSD 専用だった mode 検査は Python 標準ライブラリへ置換した。
- 現端末は preflight 後にオーナー承認を受け、公式面へ移行した。実績は「Wave 3 rollout 実績」に記録する。他端末の同名重複 probe と legacy symlink 撤去は、現役端末×入口の確定待ちである。
- MCP は `codex mcp` の list/get を read-only で確認し、`caveat` / OpenAI Docs / `aiterm` の最小 read-only 疎通を確認した。`.codegraph/` index は無いため query/init は行わず WARN、Oracle は `sessions` のみ確認して `consult` は呼んでいない。
- Throughline は `codex-capture` と `codex-handoff-smoke` が成功した一方、experimental `codex-restore-smoke` は `app-server-restart-mismatch`（期待 turn 7、観測 8）で失敗した。dotagents / Throughline の本体や session state は変更せず、Wave 3 の新規 session E2E と上流側の再現・修正待ちとして残す。

### Wave 3 — 現役端末 rollout と既存プラン閉鎖

- [ ] 各現役端末で pull→tar backup→install→config dry-run/apply→verify
- [ ] 各現役Codex入口で新規 session E2E（AGENTS / SKILLS / HOOKS / SESSIONS）
- [ ] 端末で共有できる routing/MCP 証拠は入口ごとの台帳から同じ証拠へ参照し、未実施を共有扱いにしない
- [ ] 各端末で implementer/refuter/sorter の routing smoke＋親側 verifier green
- [ ] 各入口で Codex hooks の初回 INFO・同セッション2回目沈黙・compact 再武装・Stop pending の次回1回配送を実火し、代表 skill、Throughline 代表 smoke を成功させる。明示エラーは FAIL/blocker であり合格にしない
- [ ] 任意 MCP/OAuth は未認証を FAIL にせず、理由付き WARN と H 手順を記録
- [ ] Claude の skill/command/agent/hook smoke を再実行し回帰なしを確認
- [ ] `plan_gpt56-rewiring.md` の他端末 routing TODO を本 wave の実測で消化
- [ ] 同プランの sandbox上書き/spawn応答上流問題は non-blocking の独立追跡として残す
- [ ] `plan_callout-hooks.md` Phase 6 の INFO 契約を baseline とし、README・全ゲートは Wave 2、他端末実火は本 wave で消化
- [ ] PLAN.md の「Codex skill 一覧目視」を閉じる
- [ ] 端末台帳を完成し、完了した既存プランを archive へ移す
- [ ] rollback: 問題端末だけ旧commit＋backupへ戻し、他端末のgreenを巻き戻さない

### Wave 4 — 最終監査と完了

- [ ] existence/value の独立2票＋網羅性 Critic
- [ ] `make lint`、全 smoke、clean HOME、install/verify、GitHub Actions green
- [ ] 項目ごとに実施/スキップ理由・変更ファイル・端末別検証を報告
- [ ] 本計画を `docs/archive/` へ移し、archive を含めて lint/status を再確認
- [ ] archive を含む対象だけ pathspec commit→push→origin/main 同期確認

## 7. 新規 Codex session E2E

| 面 | 合格条件 |
|---|---|
| AGENTS_MD | global→project の読込元、実効byte budget、人格・計画・F/A/H・git・報告の先頭/末尾カナリアが読め、非空 override は verify が FAIL |
| CONFIG | routing 必須キーと hook entry が重複なく、TOML/JSON 妥当 |
| SKILLS | 選択した公式/legacy面が入口ごとに一意で、重複なく対象全件が見え、明示 invocation と代表暗黙 invocation が成立 |
| PLUGINS | `非採用: 個人git+symlink配布と二重化、hook仕様も未確定` と記録 |
| MCP_SERVER_CONFIG | core必須 server が connected。任意/認証依存は理由付き WARN |
| SUBAGENTS | 3 role の routing-check green。sandbox 差は別表示 |
| HOOKS | trust 済みの SessionStart / PreToolUse / UserPromptSubmit / Stop で、初回 INFO・2回目沈黙・compact 後1回再武装・Stop pending の次回1回配送を確認。deny/ask/block を返さず、INFO が依頼範囲を拡張しない |
| COMMANDS | Claude command 3件の目的を対応 Codex skill から実行可能 |
| SESSIONS | 必須の現役入口で既存 Throughline/handoff の代表 smoke が成功。失敗は明示されても blocker。製品固有で対象外と裁定した入口だけ理由付きSKIP可 |
| 回帰 | Claude 側も新しい INFO 契約を満たし、Hook 外の既存挙動に回帰がない |

## 8. 端末台帳

現役端末×Codex入口は Wave 0 でオーナーと確定する。OS 種別だけから端末や入口の実在を推測しない。1行を1入口とし、端末共有の証拠は参照先を記録する。

| 端末 | OS | Codex入口 | skill面 | backup | install | config | verify | Codex E2E | Claude回帰 | 結果 |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|
| この端末 | macOS | desktop | official | [x] | [x] | dry-run差分0（apply不要） | [x] official | [ ] | [ ] | skill discovery green、新規 session E2E待ち |
| この端末 | macOS | CLI | official（同端末） | 同端末参照 | 同端末参照 | 同端末参照 | 同端末参照 | [ ] | 同端末参照 | skill discovery green、新規 session E2E待ち |
| オーナー確定後に追記 | — | — | — | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | 未実施 |

### Wave 3 preflight（2026-07-12・この端末・read-only）

- `apply-codex-config --dry-run` は routing / callout hook とも差分0。`config.toml` / `hooks.json` は symlink ではない regular file で、実設定 apply は不要。
- legacy 面の dotagents 所有 symlink は `audit-gauntlet` / `auto-deploy-on-push` / `oracle` / `orchestrate` / `polish-github` の5件。`verify-install.sh --profile legacy` は green。
- 公式面の `source-command-tl`、legacy 面の `codex-thread-handoff-smoke` / `throughline` は他ツール所有の実 directory であり、移行時も保存する。
- H1 承認後の対象は、関連ディレクトリの tar backup → `./install.sh --profile official` → 上記 dotagents 所有 legacy symlink 5件だけを除去 → `./bin/verify-install.sh --profile official`。失敗時は新公式 symlink 5件を外し、backup から legacy symlink を復元する。

### Wave 3 rollout 実績（2026-07-12・この端末）

- オーナー承認後、`/Users/kite/Archives/dotagents-codex-skill-migration-20260712T140950Z.tar.gz` へ旧 legacy symlink 5件を退避し、`./install.sh --profile official` で公式面へ配布した。
- dotagents 所有の旧 legacy symlink 5件だけを除去した。公式面の `source-command-tl`、legacy 面の `codex-thread-handoff-smoke` / `throughline` は保持した。
- `apply-codex-config --dry-run` は引き続き差分0のため apply をスキップした。`verify-install.sh --profile official` と Codex `debug prompt-input` による対象5 skill の discovery は green。
- 未完了は、新規 desktop / CLI session での AGENTS・明示/暗黙 skill invocation・hooks・subagent routing・Throughline E2E、Claude 回帰、他の現役端末×入口の確定と rollout である。

### Wave 0 baseline（2026-07-12・この端末）

- 同期: `main` と `origin/main` 一致、stash 0、shallow=false。着手前の Hook INFO 契約コミット `0b9d383` は push 済み。
- green: `make lint`、Claude hook smoke 20件、Codex hook smoke 28件、`install.sh`、`verify-install.sh`。
- routing: implementer / sorter / refuter は role・model・effort・developer instructions が verifier green。sandbox は親 permission profile により `danger-full-access` へ上書きされたため別表示。
- detect-only: Codex App Server 0.144.1 の `externalAgentConfig/detect`（`includeHome=true`、cwd=`dotagents`）を実行し、import は未実行。検出項目は `MCP_SERVER_CONFIG` 3件（chrome-devtools / codex-sidecar / relay-local）、`SKILLS` 1件（app-store-submit）、`SESSIONS`。その他6面は検出項目なし。検出有無は移行候補の有無であり、9面の対応合否を意味しない。
- AGENTS: `project_doc_max_bytes=65536`、global 16,141 bytes＋project 12,373 bytes＝28,514 bytes。現 Codex desktop session で人格・計画文書・F/A/H・git・報告を含む global/project 両正典の先頭から末尾まで到達を確認。非空 `AGENTS.override.md` は不在。
- 未確定: 他端末と IDE 入口の実在は H1 でオーナー確定する。現端末の CLI/desktop 個別 E2E は Wave 3 で記録する。

## 9. やらないこと

- 全面 `shared/` 移行、全資産 manifest、agent serializer を今回の目的にしない。
- plugin prototype や plugin command を作らない。
- 完了済み routing/hooks 基盤を再実装しない。
- Claude 資産をコピーして「対応済み」にしない。
- `/import` を同期や真実の源にしない。
- Throughline 本体・`~/.codex/sessions`・他ツール所有状態を dotagents へ取り込まない。
- legacy `~/.codex/skills` を無条件に全端末から削除しない。公式面対応済み入口では、H承認後に dotagents 所有 symlink だけを移行する。
- model、permissions、OAuth、trust、親 effort を自動変更しない。
- 認証情報や端末 `settings.json` / `config.toml` を repo に収録しない。
- `rsync --delete`、暗黙 fallback、未実測の成功扱いをしない。

## 10. 既知の罠

- 非空 `~/.codex/AGENTS.override.md` は global AGENTS を無言で shadow する。
- Codex hook は PascalCase key・trust・payload が Claude と異なる。PostToolUse だけでは tool 成否を取れない。
- role sandbox は親 permission profile で上書きされうる。routing 成否と sandbox 一致を混同しない。
- `ultra` は max 推論＋proactive fan-out。オーナー明示なしで使わない。
- `$HOME/.agents/skills` と legacy 面の同名 skill は重複する可能性がある。probe 以外では入口ごとに一方だけを配布する。
- Codex MCP の `[mcp_servers.X.env]` は親 env を継承しない closed-mode。
- plugin hooks は現行公式記述と local validator が矛盾するため、対応済み仕様として扱わない。

## 11. 調査・反証記録

- [x] git fetch、origin/main、dirty、stash を確認
- [x] `rag/INDEX.md` と caveat を検索
- [x] リポ資産を9面＋配布/検証/文書/OSで棚卸し
- [x] OpenAI 公式 docs と Codex CLI 0.144.1 の端末実測を突合
- [x] 公式調査を `rag/codex/` と INDEX へ還流
- [x] existence 票: SESSIONS既対応、plugin command不存在、plugin hook仕様矛盾、既存プラン移管先、max_threads既対応を訂正
- [x] value 票: 全面shared、全資産manifest、plugin実験、汎用applier、routing/hooks再実装を棄却または縮小
- [x] Critic: SESSIONS合否、archive順序、AGENTS末尾実読、skill面一意性、端末×入口E2Eを補強
- [x] 統括裁定: 実在するギャップ4 wave＋最終監査へ縮約

## 12. オーナー承認ゲート

- [x] **GO** 本計画で実装開始（既存ディレクトリの移動・改名は含まない）
- [ ] **H1** 現役端末×入口一覧、変更してよい必須設定キー/hook entry、dotagents所有legacy symlink移行の一括 rollout 承認（この Mac の official 面移行と push は 2026-07-12 承認済み。他端末一覧は未確定）
- [ ] hook trust、MCP OAuth 等の各端末 UI 操作
