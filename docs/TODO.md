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

**次の一手: P0-1 資産棚卸し（オーナー承認 H）**

## P0. dotagents 最適化【F・最優先】

- [x] リポ再生（install.sh 冪等化・bin/agents-update・README・CLAUDE.md 掟/罠/検証）＝ commits 79c1bb7〜83a4035 ＋ 2026-07-04 収容分
- [x] P0-0 聖典一式（PLAN.md・docs/・rag/・.gitignore）の初回コミット＆push（2026-07-04。**完了条件は origin 反映**＝原則2。以後の更新も都度 push）
- [x] PLAN.md 聖典 v3 化＋docs/TODO.md 分離＋ultracode 監査済み（2026-07-04。監査: critical 3件採用・minor 14件採用）
- [x] rag/ 新設・還流開始（第1号: second-brain = Karpathy/Obsidian/NotebookLM 調査、2026-07-04）
- [x] メモリ非収録方針の明文化（CLAUDE.md 収録済み）
- [x] P0-1 収録済み資産の要否棚卸し（原則6・オーナー裁定 2026-07-04）: audit-gauntlet=**作り直し済**（ultracode 型 Workflow を起動する薄い入口へ全面書換・ECC 依存排除）／auto-deploy-on-push=**ブラッシュアップ済**（前提行・concurrency をテンプレ組込み・macOS の shred 代替）／polish-github=**ブラッシュアップ済**（前提行・分岐注記）／codex/skills/throughline(repo版)=**廃止**（全端末で shadow され未使用）
- [x] P0-12 polish-github の一本化（2026-07-04。正本=claude/commands/polish-github.md、Codex 版は正本を読む薄いポインタに書換＝フォールバック禁止つき）
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
- [ ] orchestrate 憲法に「プロジェクト作業は sync-sweep green から」を1行追記
- [ ] 他端末でも掃引→トリアージ→収容（削除承認は端末ごと）

## P3. フォルダ構成標準化【F+A】

- [ ] `docs/PROJECT_LAYOUT.md` 定義（必須要件・知識基盤スタック節〔原則10・codegraph・caveat・vault-friendly 規約〕・型別レイアウト・見送り基準）
- [ ] ギャップ台帳（23リポ×標準の採点・A 並列委譲）→ 統括が移行順裁定
- [ ] 適用は P5 の波で（1リポ=1PR・git mv 履歴保存）

## P4. メモリの恒常整理と知識の昇格【A+F】

- [x] この端末13プロジェクト分の整理（2026-07-04・bulk-curation。テンプレは orchestrate references 収録済み）
- [ ] 他端末で同整理（tar バックアップ→bulk-curation→flags 裁定）
- [ ] 昇格原則の適用（P5 の各リポ再生時に同時実施）
- [ ] 恒常化: 月次でメモリ棚卸し＋rag/ Lint

## P5. 全プロジェクト再生プログラム【F+A】

- [ ] tier1: Kikoeru + codex-sidecar + ServerManager 内 telemetry/bughub（商用サブスク）
- [ ] tier2: rpgdev + sprite-forge-mcp
- [ ] tier3: aiterm-mcp + Caveat + Throughline + tools-manager
- [ ] tier4: WebAICoding + browser-to-api + dobojo + nextflic
- [ ] tier5（同期と CLAUDE.md のみ先行）: Chime / MMOAuction / Spotter / OpenCClaw / codex-link 系 / codex-rc / x-article-mcp / videomarketing
- [ ] Novel 統合済みブランチ削除（refactor/phase0・feat/landing-discovery 等）

## P6. この端末の未了ユーティリティ【F/A】

- [ ] L4（Codex/Grok）レシピ実戦検証 → 雛形と罠を orchestrate references＋caveat へ
- [ ] permission allowlist 横展開（fewer-permission-prompts を主要リポへ）
- [ ] caveat 棚卸し（own entries の public/private 一括提案）
- [x] `~/.claude` 残骸掃除（2026-07-04。backup×2 は `~/Archives/claude-leftovers-20260704.tar.gz` へ収容後に削除、fable-era-plan.md は聖典への redirect 1行に置換）

## P7. Fable 不在後の運用規定【F】

- [ ] orchestrate SKILL.md に「統括が Opus/Sonnet の場合」節（P0-2 の収録と同時に実施可）
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
