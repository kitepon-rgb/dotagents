# TODO — 消化管理（正）

方針・理由は [../PLAN.md](../PLAN.md)（聖典）。ここはチェックボックス・波・台帳だけ。完了は `[x]`、中止は ~~取り消し線~~＋理由1行。日付は絶対表記。

## 波（現在地）

```
第0波（この端末・Fable・2026-07-04〜）: 聖典化(v3・push 済) → P0 完遂
  ├ 対象リポの P2 収容が済み次第、P5 tier1 監査を並列着火してよい（PLAN P2 の先行条項はリポ単位）
第1波（この端末・Fable）: P2 掃引→終活トリアージ提案(H)→収容 → P3 標準定義
第2波（この端末・Fable）: P5 tier1-3 の監査+裁定 ←並列放置中に P6 消化
他端末（Fable 不要。P1 完成後、第1波以降と並走可）: P1（末尾にメモリ整理=P4）→ P2 掃引
最終日（2026-07-07）まで: P7 残分＋消化棚卸し
Fable 後: P5 実装消化（ダイジェスト＋implementer 契約で安価モデル継続）
※時間見積は判断材料にしない（PLAN「期限と前提」参照）
```

**人手・承認待ちの全件は [PENDING_OWNER.md](PENDING_OWNER.md) に集約**（grok login・caveat 棚卸し承認・ServerManager 正規化・Kikoeru GPL・他端末展開）。

## P0. dotagents 最適化【F・最優先】

- [x] リポ再生（install.sh 冪等化・bin/agents-update・README・CLAUDE.md 掟/罠/検証）＝ commits 79c1bb7〜83a4035 ＋ 2026-07-04 収容分
- [x] P0-0 聖典一式（PLAN.md・docs/・rag/・.gitignore）の初回コミット＆push（2026-07-04。**完了条件は origin 反映**＝原則2。以後の更新も都度 push）
- [x] P0-14 他端末展開の信頼性: `bin/verify-install.sh` 新設（install 後の symlink 自動検証・退避漏れ検出）＋install.sh の SKIP 警告を明示化＋ランブック §3 を verify-install に更新（2026-07-04）
- [x] rag/ 健全性 Lint 合格（2026-07-04・INDEX 整合・リンク切れ無し・出典/取得日/確度 欠落無し）
- [x] PLAN.md 聖典 v3 化＋docs/TODO.md 分離＋ultracode 監査済み（2026-07-04。監査: critical 3件採用・minor 14件採用）
- [x] rag/ 新設・還流開始（第1号: second-brain = Karpathy/Obsidian/NotebookLM 調査、2026-07-04）
- [x] メモリ非収録方針の明文化（CLAUDE.md 収録済み）
- [x] P0-1 収録済み資産の要否棚卸し（原則6・オーナー裁定 2026-07-04）: audit-gauntlet=**作り直し済**（ultracode 型 Workflow を起動する薄い入口へ全面書換・ECC 依存排除）／auto-deploy-on-push=**ブラッシュアップ済**（前提行・concurrency をテンプレ組込み・macOS の shred 代替）／polish-github=**ブラッシュアップ済**（前提行・分岐注記）／codex/skills/throughline(repo版)=**廃止**（全端末で shadow され未使用）
- [x] P0-12 polish-github の一本化（2026-07-04。正本=claude/commands/polish-github.md、Codex 版は正本を読む薄いポインタに書換＝フォールバック禁止つき）
- [x] P0-13b グローバル CLAUDE.md 全面リライト（2026-07-04 オーナー追加指示: ①ベル人格をグローバルへ昇格〔dotagents 側はポインタ化〕②プロンプト文書として再設計〔人格→応対規範→姿勢の五原則→調査→ツール→統括→大規模変更→git→出力衛生の順・内容は不減〕）
- [x] P0-13 グローバル CLAUDE.md ブラッシュアップ（2026-07-04。外科的4箇所: 調査節に「調べる前に caveat/rag 検索」「raw/分離・バイト数判定」「還流」「方針は正典へ」／統括節にバージョン固定禁止・MODELS.md 参照・前提行規約／git 作法に stash・shallow・identity の実被弾3行。フォールバック禁止等のオーナーの声の節は不変更。各プロジェクト分は P5 工程で実施）
- [x] P0-2 orchestrate skill 収録（2026-07-04。references/ 込み。前提行つき）
- [x] P0-3 claude/agents 収録（implementer.md・refuter.md）＋ install.sh に agents グループ追加（2026-07-04）
- [x] P0-4 各資産に前提行（2026-07-04: orchestrate・implementer・refuter・audit-gauntlet・auto-deploy-on-push・polish-github 両版に付与）
- [x] P0-5 グローバル CLAUDE.md 正本化（2026-07-04。tar バックアップ `~/Archives/claude-pre-p0-20260704.tar.gz` → `claude/CLAUDE.md` 収録 → install.sh 対応 → readlink 検証済み。応対規範〔まず会話〕を収録。**他端末は既存実ファイルの退避が必要**＝PLAN P1 手順）
- [x] P0-6 caveat 移管（2026-07-04。`~/.caveat/own` 実体→ `caveat/`、install.sh が symlink。MCP の symlink 越し動作を caveat_search で実測確認。`*.private.md` は caveat 自前 gitignore で端末ローカル維持＝PLAN P0 の境界。他端末は既存ローカルエントリを**リポへマージしてから** symlink＝PLAN P1 参照）
- [x] P0-7 docs/MODELS.md 新設（2026-07-04。役割→解決規則→解決例の三層。世代交代は解決例列の更新1枚で全端末追従）
- [x] P0-8 docs/settings.fragments.md（2026-07-04。読み取り系 allowlist・fewer-permission-prompts 正規手順・hooks 方針）
- [x] P0-9 ツール標準化（2026-07-04。オーナーの「確認なしで進めろ」指示により検証→導入→焼き込みまで実施）: **Obsidian 導入済み**（brew cask 1.12.7・この Mac。README 前提に標準として記載）／**長期記憶ツールは全て見送り**（mem0・Hindsight・claude-mem 等＝保存層のサイロ化が原則7違反。根拠と再訪条件は rag/second-brain/longterm-memory-tools-survey.md）／NotebookLM は任意の一方通行窓・低優先のまま／**README を全面刷新**: P1 ランブック（git identity・MCP 登録実測コマンド・退避手順・検証バッテリー）焼き込み・旧 clone パス廃止・資産表更新
- [x] P0-10 `.gitignore` に `.obsidian/` 追加（2026-07-04）
- [ ] P0-11 `./install.sh` 再実行 → 検証バッテリー。**2026-07-04 進捗: 再実行済み・全 link が本リポ向きを ls/readlink で確認済み（旧パス `~/projects` 宙ぶらりん3本も解消）**。Claude 側はセッションのスキル一覧に新生 audit-gauntlet・orchestrate が反映されたのを実測確認（2026-07-04）。冪等再実行も確認済み。**残: Codex セッションでのスキル一覧確認のみ**（2026-07-04 に `codex exec` で試行したが8分無応答→中断。原因未調査。symlink はファイルシステムレベルで検証済みなので、次回 Codex 対話セッションで目視確認すれば足りる）

## P1. 他端末セットアップ・ランブック【H+A】

- [x] README.md にランブック収録（2026-07-04。前提・退避手順・clone→install・MCP 登録の実測コマンド・検証バッテリー）
- [x] ランブック前提に git identity 設定を含める（README §0。この Mac は 2026-07-04 リポローカル設定済み）
- [x] 検証バッテリーに implementer 極小委譲を含める（README §3）
- [ ] 各端末: ランブック実走（退避→install→検証→メモリ整理）。この Mac 以外は未実施

## P2. Git 同期監査＋終活トリアージ【A+F+H】

- [x] `bin/sync-sweep.sh` 作成（2026-07-04。stash・非git・走査ルート・エラー行内報告つき。install.sh で全端末配布）
- [x] この端末の掃引実施（2026-07-04。27ディレクトリ=git23+非git4。結果と仮分類は docs/SYNC_LEDGER.md）
- [x] 終活トリアージの**オーナー承認(H)**（2026-07-04 修正つき承認）: 継続21／この端末では休眠2（codex-rc・x-article-mcp）／非git4 処遇済み。**分類基準「休眠は端末単位・生死はオーナー宣言のみ」を聖典 P2 に追記**
- [x] 承認後の実行（2026-07-04 実施済み）: push 3件（Novel→forklore・codex-sidecar・Kikoeru branch）／ChromeDev・grok 目視→削除／ad-studio git 化→private push（main 正規化込み）／blog-figmaker git 化（ローカルまで。**remote 作成は保留提案中**）／OpenCClaw stash はオーナー裁定で放置
- [x] 安全収容（2026-07-04）: クリーン behind 5リポを ff-only pull で同期（aiterm-mcp・codex-rc・dobojo・rpgdev・x-article-mcp）
- [x] 個別収容（2026-07-04 裁定・実施。詳細 SYNC_LEDGER）: browser-to-api rebase 線形化（push 承認待ち）／Throughline pull＋.agents/ 残置裁定／WebAICoding .playwright-mcp/ 無害裁定／.DS_Store をグローバル excludesfile で恒久対処／codex-link は現役作業ブランチと裁定
- [x] browser-to-api push・blog-figmaker private remote 作成＋push（2026-07-04 承認・実施済み）
- [x] videomarketing フォーク問題解決（2026-07-04 オーナー裁定①: 自 private へ origin 切替・価値物収容・push 済み。shallow 罠は unshallow で踏破）
- **⚠ Novel(forklore) は作業中ロック（オーナー宣言 2026-07-04）**: 別セッション稼働中。P5 の Novel 残骸削除・監査等は着手前に必ずオーナーへ申告
- [ ] ServerManager master→main 正規化（P5 tier1 時）
- [x] `docs/SYNC_LEDGER.md` 起票（2026-07-04）
- [x] orchestrate 憲法に「同期先行（sync-sweep で fetch→照合してから触る）」を第1条として追記（2026-07-04・8カ条化）
- [ ] 他端末でも掃引→トリアージ→収容（削除承認は端末ごと）

## P3. フォルダ構成標準化【F+A】

- [x] `docs/PROJECT_LAYOUT.md` 定義（2026-07-04・必須要件・知識基盤スタック節・型別レイアウト・見送り基準）
- [x] ギャップ台帳（2026-07-04・21リポ sonnet 並列採点→ベル裁定。docs/P3_GAP_LEDGER.md）
- [ ] **標準化ミッション（2026-07-04 方針転換）**: 見送り撤回。対象16リポに付属物（rag/CI/docs連番/adr/settings）を Codex 委譲で足す。対象/除外は docs/P3_GAP_LEDGER.md。パイロット sprite-forge-mcp から

## P4. メモリの恒常整理と知識の昇格【A+F】

- [x] この端末13プロジェクト分の整理（2026-07-04・bulk-curation。テンプレは orchestrate references 収録済み）
- [ ] 他端末で同整理（tar バックアップ→bulk-curation→flags 裁定）
- [ ] 昇格原則の適用（P5 の各リポ再生時に同時実施）
- [ ] 恒常化: 月次でメモリ棚卸し＋rag/ Lint

## P5. 全プロジェクト再生プログラム【F+A】

- **方針転換（オーナー是正 2026-07-04）: P5 を「一律の敵対的監査」から「標準化（同期＋フォルダ構成＋CLAUDE.md）」へ絞る。** 監査はオーナー個別依頼時のみの例外運用。工場整備の本旨に回帰。
- [x] Kikoeru 監査（例外運用の実績。商用サブスクゆえオーナー価値確認済み。ダイジェスト Kikoeru@a15efa3。C1 GPL は環境 PLAN 完了後にオーナー対応）
- [x] codex-sidecar 監査は**中止**（2026-07-04・走りすぎ是正で TaskStop。標準化のみ実施へ）
- [ ] **標準化パイプライン**を工場ライン順で適用（監査しない。実物量は implementer/Workflow へ委譲＝原則1の自己適用）: ①開発基盤（aiterm-mcp・Caveat・Throughline・tools-manager）②稼働資産（Kikoeru・rpgdev・sprite-forge-mcp・WebAICoding・browser-to-api・dobojo・nextflic・codex-sidecar・ServerManager〔master→main も〕）③残り
- [x] P3 ギャップ台帳を Workflow 並列委譲で作成（2026-07-04・21リポ・sonnet 採点・Fable 窓消費ゼロ）→ ベル裁定済み（docs/P3_GAP_LEDGER.md）
- [x] 波A（実害・機械的）: tools-manager .gitignore 新設（2026-07-04・**Codex 委譲＝Claude レート消費ゼロで実証**。.DS_Store は追跡外と検証判明。tools-manager@37af853）
- [x] 波B（CLAUDE.md 欠落）: tools-manager・browser-to-api に CLAUDE.md 新規（2026-07-04・Codex 委譲→ベル検証・Fable 窓消費ゼロ）
- [x] 委譲ツール bin/delegate.sh 新設（2026-07-04・timeout 内蔵・CLAUDE.md 前置・git status 表示。~/.local/bin/delegate）
- [~] P6-1: L4 実測。**Codex は delegate で実証済**（波A/B 稼働）。**Grok は要 `grok login`（H・この端末未認証）**——ログイン後に `grok agent {stdio\|headless}` の非対話形を実測し delegate grok を有効化（現状は明示エラーで停止＝動くフリ回避）。**smux 実物評価済＝不採用**（tmux-bridge が aiterm-mcp と機能重複・tmux 競合リスク）。能力は `delegate review`＋aiterm で吸収・実証済（rag/orchestration/smux）
- [ ] ~~波C（見送り）~~ **撤回→標準化ミッションで積極実施**（rag/CI/docs連番を対象16リポへ。ServerManager master→main も標準化時に同時）
- 注（2026-07-04 P5 絞り込み後）: tier2-5 の「標準化」は実質完了状態＝同期✅（P2 collect 済）・CLAUDE.md ✅（欠落2件は波B で補完・他は present）・フォルダ構成移動は churn>益で見送り裁定（各リポの次の整理機会に）。**残る個別対応は下記のみ**:
  - [ ] ServerManager master→main（稼働影響確認後・H。PENDING_OWNER）
  - [ ] Novel(forklore) 統合済みブランチ削除（ロック解除後・A）
  - [ ] 監査はオーナー個別依頼時のみ（Kikoeru 実施済。横展開しない）

## P6. この端末の未了ユーティリティ【F/A】

- [~] L4 レシピ実戦検証: Codex は delegate で実証済（波A/B）・雛形は delegate.sh に結晶化。Grok は grok login(H) 後に実測（P6-1・PENDING_OWNER）
- [ ] permission allowlist 横展開（fewer-permission-prompts を主要リポへ）＝要クオ君確認（settings いじりは自律回避・PENDING_OWNER）
- [~] caveat 棚卸し（2026-07-04 ベル裁定済。45件=public38/private7。private→public 化提案3件は PENDING_OWNER.md＝承認待ち。残り4件は repo/インフラ固有で private 妥当）
- [x] `~/.claude` 残骸掃除（2026-07-04。backup×2 は `~/Archives/claude-leftovers-20260704.tar.gz` へ収容後に削除、fable-era-plan.md は聖典への redirect 1行に置換）

## P7. Fable 不在後の運用規定【F】

- [x] orchestrate SKILL.md に「統括が Fable 級でない場合」節（2026-07-04・検証2票制/棄却側裁定/契約クリティカル前の refuter/エスカレーション裁量）＋知能配置表を外部枠優先・delegate に整合
- [ ] 最終日: 消化棚卸し（本 TODO の総ざらい＋積み残しの委譲契約化）

## 実測台帳（この端末 `~/Developer`・2026-07-04 スナップショット）

鮮度注記: 2026-07-04 の即値（一部は同日の ultracode 監査エージェントによる実測で補正済み）。**→ 同日 docs/SYNC_LEDGER.md を起票済み＝以後はそちらが正**（下表は歴史記録として残置）。

`~/Developer` 直下 27 ディレクトリ＝ git リポ 23 ＋ 非 git 実プロジェクト 2（下表）＋ その他。特記事項のみ:

| リポ | 要対応 |
|---|---|
| dotagents | P0 進行中（聖典 v3・rag/ 稼働・2026-07-04 収容済み。P0-1 以降が残） |
| Throughline / WebAICoding / tools-manager | dirty 各1 → P2 で照合・収容 |
| videomarketing | dirty 2 ＋ remote が外部フォーク（digitalsamba/claude-code-video-toolkit）→ 自リポへ切るか判断（H） |
| browser-to-api | **分岐**（ahead 1 / behind 1。2026-07-04 監査実測。素朴に push すると reject → force は他端末のコミットを失う）→ fetch→照合→裁定 |
| codex-sidecar | **unpushed 2**（aa571fe / c472dcf・2026-06-04。tier1 商用系なのに未 push）→ push |
| aiterm-mcp / x-article-mcp / dobojo | behind のみ（6 / 2 / 1。最終 fetch 2026-06-17 時点）→ pull で追従 |
| OpenCClaw | **stash@{0} に CLAUDE.md 類の未収容編集が残置**（2026-05。status はクリーンに見える）→ stash をブランチ化して収容 |
| codex-link | 迷いブランチ `codex/mvp-host-pairing-flow` に滞在 → main との関係整理 |
| ServerManager | 既定ブランチが master → main 正規化候補 |
| ad-studio / blog-figmaker | **非 git 実プロジェクト**（.git 自体が無い＝無防備）→ トリアージ対象（継続なら git 化、休眠なら tar 退避） |
| メモリ無しリポ多数 | Caveat / MMOAuction / Spotter / ServerManager / aiterm-mcp / codex-rc / codex-sidecar / Throughline / tools-manager / x-article-mcp ＝ CLAUDE.md 整備の主対象 |
