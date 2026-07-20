# dotagents Codex 全対応計画

> 実行順と全体状態の親正本は[開発工場 統合マスター計画](plan_factory-master.md)。本書はCodex全端末配布・実火の詳細受入TODOを所有し、Callout／GPT-5.6再配線の他端末確認を同じhost receiptへ集約する。
> 履歴注記（2026-07-14）: 本計画で追加した`audit-gauntlet`は、過大な結果を出すため
> オーナー裁定で使用廃止・削除した。以下の記載は当時の実装履歴であり、現行の配布資産ではない。

作成: 2026-07-12
状態: 実装中（オーナー GO: 2026-07-12、Wave 2・この Mac・メインサーバー・FOX Windows / WSL2 の基盤 rollout を検証済み。新規 session E2E 待ち）

## 0. 目的

dotagents を全端末の**開発工場そのもの**として、Claude Code と Codex のどちらを親にしても同じ工場原則・主要 workflow・委譲品質・端末再現性を得られる状態にする。ServerManagerをdotagentsと並ぶ別の工場またはcontrol planeとは定義しない。

工場のコア管理対象は、端末能力を担う **Caveat（罠知識）／Throughline（セッション継続）／Spotter（未使用ツール監査）／Codegraph（コード構造理解）／MarkItDown（外部資料変換）／gpt-connector（独立したChatGPT consultation）／aiterm-mcp（PTY・外部モデル枠）／codex-sidecar（Claude/Codex親からの隔離Codex実行）** の8製品と、中央の運用管理を担う **ServerManager** の計9製品とする。gpt-connector は MCP ID `gpt_connector`、command `gpt-connector-mcp`、専用Chrome、product-owned state、caller既知slug、model+effort明示、timeout後sessionsを正規契約とし、Oracle・APIへの暗黙fallbackを許さない。Oracleはv1互換または手動rollback時だけ扱う。**BugHubは独立した第10製品ではなくServerManager内部のバグ・version・互換性統括コンポーネント**である。dotagentsは各製品のソースと状態を所有せず、正規導入・更新・親別配線・互換検証・代表E2E・上流更新追従、およびServerManager/BugHubへの結果連携を所有する。

「全対応」はファイル数の左右対称ではなく**能力対称**を指す。製品固有機能は無理に移植せず、`対応 / 製品固有 / 非採用（理由）` のいずれかを明記できれば閉じる。

## 1. 完了条件（本計画が TODO を兼ねる）

- Latticeへ移管済み: cf-0020 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L52
- Latticeへ移管済み: cf-0021 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L53
- Latticeへ移管済み: cf-0022 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L56
- Latticeへ移管済み: cf-0023 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L57
- Latticeへ移管済み: cf-0024 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L58
- Latticeへ移管済み: cf-0025 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L59
- Latticeへ移管済み: cf-0026 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L60
- Latticeへ移管済み: cf-0027 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L64
- Latticeへ移管済み: cf-0028 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L72
- Latticeへ移管済み: cf-0029 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L75

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
| AGENTS_MD | ルート`AGENTS.md`、共通正本＋host deltaから作るClaude/Codexグローバル生成物、生成一致gateあり | 対応済み。サイズ上限・override shadowを最終E2Eで再確認 |
| CONFIG | `docs/03`・`docs/05` に断片、端末適用は手動 | 必須キーと dotagents hook だけ安全に適用・検証できるようにする |
| SKILLS | Claude 3件、Codex 3件。Codex `orchestrate` は Claude 本文丸ごと symlink | `orchestrate` を製品別入口へ分け、`audit-gauntlet` と `auto-deploy-on-push` を Codex 化 |
| PLUGINS | repo 内 manifest/marketplace なし | **非採用**。個人git+symlink配布を二重化するため今回の完了条件外 |
| MCP_SERVER_CONFIG | Claude 登録手順が中心。Codex は一部断片のみ | 親別の必須/任意/禁止 matrix と Codex 登録・疎通手順を追加 |
| SUBAGENTS | Codex 3 role、routing verifier、現端末 smoke あり | 基盤は対応済み。native audit 追加と他端末 E2E だけ |
| HOOKS | Claude C1-C4 / Codex X1-X5 は正典参照の短い INFO。初回案内・compact 再武装・Stop pending 配送を smoke 済み | INFO 契約を再設計しない。CI 昇格、README、他端末実火だけ |
| COMMANDS | Claude command 3件、Codex 対応表なし | Codex は対応 skill の明示 invocation を正規入口にする。架空の plugin command は作らない |
| SESSIONS | Throughline と handoff smoke が端末外で実装済み | 新規実装しない。dotagents は配線存在と代表 capture/restore/handoff を受け入れ検証 |
| FACTORY_CORE | 8製品の必須度・更新面が不整合。gpt-connectorは通常入口、aitermは前提とmatrixが矛盾、sidecarはClaude親だけcore、Spotterはdotagents自身に未接続、MarkItDownは更新管理外 | 8製品を外部所有の必須工場コアとして統一。NPM＋`uv tool`更新、親別配線、互換・代表E2Eをdotagentsの保守責務にする。Oracleはv1互換・手動rollbackだけ |
| FACTORY_MANAGEMENT | ServerManager/BugHubはサーバー運用・アプリbug集約を実装済みだが、dotagents配下のコア管理階層と8製品のversion/compatibility連携が未定義 | ServerManagerを第9のコア管理対象、BugHubをその内部コンポーネントと定義。工場そのものはdotagentsに一意化し、既存BugHub契約を壊さず連携する |
| 配布/CI | `~/.codex/skills` のみ。clean HOME E2E なし | 公式 skill 面を追加し、repo配布CIと実端末 E2Eを分離 |

## 4. 設計方針

1. **能力対称、実装は製品固有**: Claude Workflow と Codex native subagent を同じ実行本文へ押し込まない。
2. **全面移動はしない**: 既存ディレクトリを `shared/` へ一括移動しない。まず `orchestrate` の製品中立契約だけを共通 reference として抽出し、再利用が実証された範囲だけ後から広げる。
3. **入口は小さく、契約は一つ**: Claude/Codex の `SKILL.md` は各製品の入口を持ち、F/A/H・反証・委譲契約など共通部分は同じ reference を読む。
4. **既存安全網を育てる**: 新しい全資産 manifest や汎用診断器を増やさず、`install.sh`・`verify-install.sh`・既存 smoke・README 対応表を正本にする。
5. **公式面を既定、legacy は明示互換**: `$HOME/.agents/skills` を既定にする。古い入口だけ explicit legacy profile を使い、同じ入口へ両面を常設しない。dotagents 所有の旧 symlink を外す時は dry-run・backup・H承認を必須にし、他の local skill は触らない。
6. **端末設定は狭く扱う**: model、permissions、OAuth、hook trust を自動変更しない。自動適用は routing 必須2キーと dotagents 固有 hook entry の追加だけ。
7. **一波一責務**: 各 wave は独立 commit、フルゲート、個別 revert が可能な単位にする。
8. **工場コア8製品の所有権と統合責務を分ける**: 製品ソース・Caveatのown・Throughlineの状態・Spotterの状態/hook等は各製品自身に管理させる。dotagentsは再実装・複製せず、導入・NPM/`uv tool`週次更新・親別配線・互換fixture・代表E2E・上流更新追従を所有する。Spotterは対象projectごとの明示installに限定する。**2026-07-14 supersession**: Codex親のsidecar/aiterm経由の入れ子Codex禁止は撤回し、native枠外のexternal executionとして積極利用する。
9. **工場と管理製品を混同しない**: 工場そのものはdotagents。ServerManagerはdotagentsが管理・連携する中央管理コアであり、BugHubはその内部コンポーネント。ServerManager/BugHubをdotagentsと並ぶ別工場・別control planeとして扱わない。

## 5. Workflow 対応表

| 能力 | Claude 入口 | Codex 入口 | 実装方針 |
|---|---|---|---|
| orchestrate | `claude/skills/orchestrate` | `codex/skills/orchestrate` | 丸ごと symlink を廃止。共通契約＋Claude appendix＋Codex native appendix |
| audit-gauntlet | skill + command | 新規 Codex skill | Find→Dedup→existence/value反証→Critic を native subagent で再現 |
| auto-deploy-on-push | skill + command | 新規 Codex skill | 承認・安全・検証契約を共通化し、Codex shell/agent 入口へ翻訳 |
| polish-github | Claude command | 既存 Codex skill | 既存正本参照を確認し、変更は差分がある場合だけ |
| gpt-connector | Claude/Codex MCP（`gpt_connector`） | `gpt-connector-mcp` | `consult` は相談であり委譲ではない。caller既知slug、model+effort明示、専用Chrome、product-owned state、timeout後sessionsを使い、Oracle・APIへ暗黙fallbackしない |

暗黙 invocation は非決定的なので全件×複数回を完了条件にしない。frontmatter 静的検証、全件の明示 invocation、代表 skill の暗黙 invocation を新規 session で確認する。

## 6. 実装 Wave

### Wave 0 — ベースラインと有限化（挙動不変）

- Latticeへ移管済み: cf-0088 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L76
- Latticeへ移管済み: cf-0089 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L77
- Latticeへ移管済み: cf-0090 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L78
- Latticeへ移管済み: cf-0091 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L79
- Latticeへ移管済み: cf-0092 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L80
- Latticeへ移管済み: cf-0093 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L81
- Latticeへ移管済み: cf-0094 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L82
- Latticeへ移管済み: cf-0095 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L83

### Wave 1 — 実在する Workflow ギャップを閉じる（能力追加）

- Latticeへ移管済み: cf-0099 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L84
- Latticeへ移管済み: cf-0100 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L6
- Latticeへ移管済み: cf-0101 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L7
- Latticeへ移管済み: cf-0102 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L8
- Latticeへ移管済み: cf-0103 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L9
- Latticeへ移管済み: cf-0104 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L10
- Latticeへ移管済み: cf-0105 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L11
- Latticeへ移管済み: cf-0106 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L12
- Latticeへ移管済み: cf-0107 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L13

### Wave 2 — 配布・Config・MCP・継続の再現性（能力追加）

- Latticeへ移管済み: cf-0111 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L14
- Latticeへ移管済み: cf-0112 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L15
- Latticeへ移管済み: cf-0113 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L16
- Latticeへ移管済み: cf-0114 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L17
- Latticeへ移管済み: cf-0115 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L18
- Latticeへ移管済み: cf-0116 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L19
- Latticeへ移管済み: cf-0117 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L20
- Latticeへ移管済み: cf-0118 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L21
- Latticeへ移管済み: cf-0119 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L22
- Latticeへ移管済み: cf-0120 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L23
- Latticeへ移管済み: cf-0121 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L24
  - Claude 親: codex-sidecar、aiterm、caveat、codegraph、gpt_connector
  - Codex 親: native subagents、codex-sidecar、aiterm（Codex/Grok/Composer用）、caveat、codegraph、gpt_connector/OpenAI Docs（2026-07-14 supersession）
- Latticeへ移管済み: cf-0124 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L25
- Latticeへ移管済み: cf-0125 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L26
- Latticeへ移管済み: cf-0126 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L27
- Latticeへ移管済み: cf-0127 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L28
- Latticeへ移管済み: cf-0128 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L29
- Latticeへ移管済み: cf-0129 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L30
- Latticeへ移管済み: cf-0130 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L31

#### Wave 2 の安全実装・実測（2026-07-12）

- 隔離 temporary HOME で `install.sh --profile official`、symlink 経由の `apply-codex-config --dry-run/--apply`、`verify-install --profile official`、Codex `debug prompt-input` を通した。対象5 skill（`audit-gauntlet` / `auto-deploy-on-push` / `oracle` / `orchestrate` / `polish-github`）がリポの公式 skill 面を読んだ。
- `make ci` は `make lint` と clean HOME の profile / config / rollback fixture を連結する。CI は `@openai/codex@0.144.1` を明示導入し、macOS/BSD 専用だった mode 検査は Python 標準ライブラリへ置換した。
- 現端末は preflight 後にオーナー承認を受け、公式面へ移行した。実績は「Wave 3 rollout 実績」に記録する。他端末の同名重複 probe と legacy symlink 撤去は、現役端末×入口の確定待ちである。
- MCP は `codex mcp` の list/get を read-only で確認し、`caveat` / OpenAI Docs / `aiterm` の最小 read-only 疎通を確認した。`.codegraph/` index は無いため query/init は行わず WARN、Oracle は `sessions` のみ確認して `consult` は呼んでいない（当時Oracle。現行の通常入口はgpt-connector）。
- Throughline は `codex-capture` と `codex-handoff-smoke` が成功した一方、experimental `codex-restore-smoke` は `app-server-restart-mismatch`（期待 turn 7、観測 8）で失敗した。dotagents / Throughline の本体や session state は変更せず、Wave 3 の新規 session E2E と上流側の再現・修正待ちとして残す。

### Wave 3 — 現役端末 rollout と既存プラン閉鎖

> 実行用チェックリスト（2026-07-18・Composer外部レーン下書き・典拠付き）: [docs/r2-e2e-checklist.md](r2-e2e-checklist.md)。Wave 3消化時にこれを使い、完了後は本checklistをarchiveへ退避する。

- Latticeへ移管済み: cf-0144 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L32
- Latticeへ移管済み: cf-0145 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L33
- Latticeへ移管済み: cf-0146 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L34
- Latticeへ移管済み: cf-0147 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L35
- Latticeへ移管済み: cf-0148 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L36
- Latticeへ移管済み: cf-0149 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L37
- Latticeへ移管済み: cf-0150 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L38
- Latticeへ移管済み: cf-0151 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L39
- Latticeへ移管済み: cf-0152 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L40
- Latticeへ移管済み: cf-0153 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L41
- Latticeへ移管済み: cf-0154 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L42
- Latticeへ移管済み: cf-0155 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L43
- Latticeへ移管済み: cf-0156 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L44
- Latticeへ移管済み: cf-0157 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L45
- Latticeへ移管済み: cf-0158 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L46

### Wave 4 — 最終監査と完了

- Latticeへ移管済み: cf-0162 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L47
- Latticeへ移管済み: cf-0163 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L48
- Latticeへ移管済み: cf-0164 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L49
- Latticeへ移管済み: cf-0165 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L50
- Latticeへ移管済み: cf-0166 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L51

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

| 端末 | OS | Codex入口 | skill面 | 端末共有基盤 | 入口固有E2E | 現在地 |
|---|---|---|---|---|---|---|
| Mac | macOS | 対話Codex CLI | official | install/config/verify受入済み | AGENTS/SKILLS、resume、hook lifecycleは実測。入口固有PreToolUse/Stop pending、Spotter session相関、Throughline restoreは未達 | `partial`（[baseline](adr/0093-cf0023-new-codex-session-acceptance.md)、[cf-0146進捗](evidence/2026-07-21-cf0146-five-entry-e2e-progress.md)） |
| main-server | Ubuntu 26.04 | 対話Codex CLI | official | install/config/verify受入済み | Spotter session相関とhook lifecycleは実測。AGENTS、入口固有Stop pending、Throughline handoffは未達 | `partial`（[runtime](evidence/2026-07-21-cf0216-main-server-codex-cli-runtime.json)、[cf-0146進捗](evidence/2026-07-21-cf0146-five-entry-e2e-progress.md)） |
| main-server | Ubuntu 26.04 | Codex App Remote | official（同host） | main-server共有証拠を参照 | SKILLS、Stop pending、handoffは実測。AGENTS、compact再武装、Remote threadとSpotter eventの直接相関は未達 | `partial`（[ADR 0105](adr/0105-cf0216-main-server-remote-acceptance.md)、[cf-0146進捗](evidence/2026-07-21-cf0146-five-entry-e2e-progress.md)） |
| FOX | WSL2 Ubuntu 26.04 | 対話Codex CLI | official | install/config/verify受入済み | hook lifecycleとSpotter新規eventは実測。AGENTS、tracked skill証拠、入口固有PreToolUse/Stop pending、Throughline handoffは未達 | `partial`（[ADR 0099](adr/0099-cf0092-partial-baseline-and-windows-blocker.md)、[cf-0146進捗](evidence/2026-07-21-cf0146-five-entry-e2e-progress.md)） |
| FOX | Windows native | 対話Codex CLI | official | install/config/verify受入済み | 入口実在・routing・dotagents callout実火済み。新規session横断E2Eは未達 | `blocked`。Codex CLI models cache/toolchain blockerを`cf-0092`が所有（[ADR 0099](adr/0099-cf0092-partial-baseline-and-windows-blocker.md)） |

Mac Desktop/IDEとFOX WSL2 App Remoteは、オーナーが現役入口として確定した証拠がないため推測で追加しない。FOX Windows Codex App SSHは上流不整合により非採用であり、実在するWindows native CLIと混同しない。

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

### Wave 3 rollout 実績（2026-07-12・main-server）

- Codex App公式Remote connectionで `main-server` を追加し、`kite@ubuntu` へのSSH接続を実測した。Codex CLIを0.130.0から0.144.1へ更新し、ChatGPT認証済みを確認した。
- `~/Developer/dotagents` へprivate repoをcloneし、origin/main同期・stash 0・shallow=false・clean・着手前 `make ci` greenを確認した。GitHub資格情報はheadless環境の `~/.config/gh/hosts.yml` にmode 0600で保存される。
- tar backup後にofficial install、Codex routing / hooks、Claude必須hook 5本、Caveat-Private、親別MCP、MarkItDown、週次cronを配線した。`verify-install --profile official` と対象5 skill discoveryは当時の契約でgreen。Chrome不在のためOracle MCPは未配線であり、2026-07-13の工場コア再分類後は未完了として再検証対象に戻す。
- 稼働監査はsystemd failed 0、containerd active・restart count 0、全Docker container running、healthcheck対象全件healthy。メインサーバーはオーナー裁定により常時稼働工場として正式採用した。
- 2026-07-21の再実火では、CLI `/hooks` の15件個別trust、Codex App Remote新規thread、初回INFO／2回目沈黙、3 role routing verifier、dotagents配布skill、Stop pendingの1回配送、Claude新規session回帰がgreen。Throughline handoffはApp turnのsandboxでは`~/.codex/sessions`を書けないことを切り分け、main-server host shellから新thread `019f80f0-c1ca-7152-9a72-a815da1ab092`を作成しdeveloper handoff itemを確認した。compact後callout再武装だけは同一Desktop接続で未証明のため、横断工程`cf-0149`で継続する。詳細は[単一Remote証跡](evidence/2026-07-21-cf0216-main-server-codex-app-remote.json)。
- Latticeへ移管済み: cf-0215 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L54
- Latticeへ移管済み: cf-0216 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L55

### Wave 3 rollout 実績（2026-07-13・FOX WSL2）

- Windows の ProxyJump 経由 `fox-wsl` SSH を確立し、`/home/kite/Developer/dotagents` を origin/main 相当へ同期した。GitHub認証切れのため初期同期はMacからのローカルbundleを使い、remote自体はGitHubのまま保持した。
- tar backup後にofficial install、Codex routing / hooks、Claude必須hook 5本、Caveat-Private、親別MCP、MarkItDown、週次cronを配線した。`verify-install --profile official`、対象5 skill discovery、`make ci` はgreen。
- Chrome不在かつOracle 0.16.0が当時のNode 22を拒否したため、Oracle MCPは未配線。2026-07-13の工場コア再分類後は未完了として再検証対象に戻す。hook trust、routing role実火、Throughline、Claude新規session回帰はH待ち。

### Wave 3 rollout 実績（2026-07-13・FOX Windows native）

- `C:\Users\kite_\Documents\Program\dotagents` はオーナー裁定の既存正規パスとして維持した。Developer Modeとnative symlinkを使い、旧実体 `~/.codex/AGENTS.md` とdotagents所有legacy skillだけをtar退避後にofficial面へ移行した。
- Windows実機で露見したLF・UTF-8・MSYS path・native symlink・tar path・POSIX mode・cron対象外の差を正本CIへ収容し、`verify-install --profile official`、対象5 skill discovery、`make ci` をgreenにした。Codex 0.144.1、Claude 2.1.207、Caveat 0.15.0へ更新し、週次Task Schedulerの既存 `agents-update` を確認した。
- Codex routing / hooks、Claude必須hook 5本、Caveat-Private 205件、親別MCPを配線した。廃止済みdynv6のClaude 4件 / Codex 1件は設定backup後に削除し、WSLに残ったClaude 3件 / Codex 1件も同様に撤去した。main-serverには残存なし。
- Oracle wrapperの `/opt/homebrew` / macOS Chrome固定を実機で検出し、Node/npm global rootとChromeをOS別解決する正本修正＋`tests/oracle/wrappers.sh`を追加した。コミット同期後のWindows実機でOracle MCP `Connected`、`make ci`、5 skill discoveryを再確認した。
- Codex App上の `windows-workstation` 赤表示は、SSH認証後の `remote_codex_lookup` でAppがPOSIX/csh用bootstrapを送り、Windows OpenSSH既定のPowerShellが `MissingStatementBlock` にする製品側不整合とログで特定した。Windows既定SSH shellの全体変更は既存PowerShell運用を壊すため非採用。Appはgreenの `fox-wsl`、Windows nativeは通常SSHを正規入口とし、赤接続は再接続停止のためUIで無効化する。
- 未完了はWindows GitHub認証とshallow解除、hook trust、routing role / Throughline / Claude新規session E2E。通常SSH、Windows sshd、remote `codex --version` はgreen。

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

- Latticeへ移管済み: cf-0267 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L61
- Latticeへ移管済み: cf-0268 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L62
- Latticeへ移管済み: cf-0269 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L63
- Latticeへ移管済み: cf-0270 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L65
- Latticeへ移管済み: cf-0271 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L66
- Latticeへ移管済み: cf-0272 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L67
- Latticeへ移管済み: cf-0273 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L68
- Latticeへ移管済み: cf-0274 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L69
- Latticeへ移管済み: cf-0275 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L70

## 12. オーナー承認ゲート

- Latticeへ移管済み: cf-0279 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L71
- Latticeへ移管済み: cf-0280 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L73
- Latticeへ移管済み: cf-0281 → docs/archive/lattice-source-ledger/codex-full-support-cutover-20260719.md#L74
