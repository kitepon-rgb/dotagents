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
- [ ] P0-12 polish-github の Claude 版と Codex 版の本文一本化（棚卸しで「残す」判定・分岐は継続課題）
- [ ] P0-2 orchestrate skill 収録（実体 `~/.claude/skills/orchestrate/` → `claude/skills/orchestrate/`）
- [ ] P0-3 claude/agents 収録（implementer.md・refuter.md、実体 `~/.claude/agents/`）＋ install.sh に agents グループ追加
- [ ] P0-4 各資産に前提行を仕込む（原則6。例: `前提: Fable級統括／Sonnet級実装者（2026-07 時点）`）
- [ ] P0-5 グローバル CLAUDE.md 正本化（`~/.claude` を tar バックアップ → `claude/CLAUDE.md` 収録 → install.sh symlink 対応。応対規範〔まず会話〕を収録＝PLAN P0 参照）
- [ ] P0-6 caveat 移管（`~/.caveat/own` → `caveat/` symlink。他端末は既存ローカルエントリを**リポへマージしてから** symlink＝PLAN P1 参照）
- [ ] P0-7 docs/MODELS.md 新設（役割→現行最強対応表・latest 型・Codex/Grok Build 含む）
- [ ] P0-8 docs/settings.fragments.md（permissions/hooks 推奨断片。機微はコミットしない）
- [ ] P0-9 ツール標準化: 候補を現行ドキュメントで検証 → 根拠つき一覧をオーナーに提案 → 導入 → install.sh/README 焼き込み（候補: Obsidian=窓／NotebookLM=任意の一方通行窓・低優先／長期記憶系ツール=要調査／その他は検証時に追加）
- [x] P0-10 `.gitignore` に `.obsidian/` 追加（2026-07-04）
- [ ] P0-11 `./install.sh` 再実行 → 検証バッテリー（`linked:`/`SKIP` 期待どおり・`ls -la` で link 先が本リポ・新セッションで skill/agents/commands 一覧に出る）。2026-07-04 実測: この Mac の `~/.claude/skills` にリポ skill 未リンク

## P1. 他端末セットアップ・ランブック【H+A】

- [ ] README.md にランブック収録（前提・clone→install・MCP 登録コマンド確定記載・検証バッテリー）— P0 の標準化成果に従う
- [ ] ランブック前提に git identity 設定を含める（PLAN P1 参照。この Mac は 2026-07-04 にリポローカルで設定済み、他端末は未確認）
- [ ] 検証バッテリーに「極小タスクを implementer に委譲して契約どおりの報告が返る」を含める
- [ ] 各端末: メモリ整理（P4 手順）

## P2. Git 同期監査＋終活トリアージ【A+F+H】

- [ ] `bin/sync-sweep.sh` 作成（fetch --all → ahead/behind・dirty・unpushed・**stash 数**・迷いブランチ・既定ブランチ・NO_REMOTE・gitignore 貴重物・**開発ルート直下の非 git ディレクトリ**を台帳出力。走査ルートは端末ごとに SYNC_LEDGER に記録）
- [ ] 掃引 → **git リポ＋非 git 実プロジェクト**を継続/休眠/削除候補に仮分類 → **一覧でオーナー承認(H)**
- [ ] 承認済み削除を安全手順で実行（PLAN P2 の条件・退避手順に従う。GitHub 側は archive）
- [ ] 残すリポを1リポずつ収容（dirty 裁定=F／unpushed push／迷いブランチ裁定／master→main 正規化〔ServerManager〕／videomarketing フォーク問題=H）
- [ ] `docs/SYNC_LEDGER.md` 起票（端末×リポの最終確認日・処遇）
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
- [ ] `~/.claude` 残骸掃除（settings.json.caveat-backup×2・旧版計画 fable-era-plan.md の削除 or redirect 化。P0-5 と同時）

## P7. Fable 不在後の運用規定【F】

- [ ] orchestrate SKILL.md に「統括が Opus/Sonnet の場合」節（P0-2 の収録と同時に実施可）
- [ ] 最終日: 消化棚卸し（本 TODO の総ざらい＋積み残しの委譲契約化）

## 実測台帳（この端末 `~/Developer`・2026-07-04 スナップショット）

鮮度注記: 2026-07-04 の即値（一部は同日の ultracode 監査エージェントによる実測で補正済み）。**以後の正は P2 の docs/SYNC_LEDGER.md**（作成後はそちらを見る）。

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
