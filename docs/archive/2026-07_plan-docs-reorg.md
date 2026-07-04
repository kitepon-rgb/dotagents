# PLAN_DOCS_REORG — 文書再編: 3分類・docs/archive 化・憲章 v4・プラン規範のグローバル化

> **📦 役目終了（2026-07-05 アーカイブ）**: 全項目消化・検証バッテリー合格・push 済み（commits fd486c4〜）。以後の現在地は [../../PLAN.md](../../PLAN.md)（憲章 v4）の残件節が正。

作成: 2026-07-05。**本ファイルがこのプランの正本であり、TODO を兼ねる**（グローバル CLAUDE.md に今回追記する「プランは docs/ に作れ・プランは TODO を兼ねろ・役目を終えたら docs/archive/ へ」の最初の自己適用）。完遂したら本ファイル自身を docs/archive/ へ移して閉じる。

## Context

Fable 期の環境整備キャンペーン（聖典 v3・P0〜P7）は 2026-07-04 に全3端末（MacBook・FOX Windows native・FOX WSL2）で完遂した。文書群は「①趣旨 ②趣旨を実現し役目を終えたもの ③今後の TODO」の3種が PLAN.md・docs/ 各所に混在している。オーナー指示（2026-07-05）:

1. 役目を終えた文書は **docs/archive/ へ素直に移動**する。
2. この文書3分類とライフサイクル自体を**プロジェクトの趣旨文書に書く**。
3. グローバル CLAUDE.md に **「プランは必ずプロジェクトの docs/ に作れ」「プランは TODO を兼ねろ」＋結びの「役目を終えた文書は docs/archive/ へ」の3行セット**を追記する（承認済み）。
4. PLAN・CLAUDE からキャンペーン由来の記述を刈る（恒久教訓は残す。承認済み）。

refuter による敵対的検証済み（kill 2・major 8 を本プランに反映）。FOX の「承認待ち」テーブルは**オーナー確認により処理済み・台帳未消し込みのみ**＝凍結注記で archive してよい。着手直前の origin 追従（7dcaf41）で増えた **docs/P4_PROMOTION_QUEUE.md は生きた作業キュー＝archive しない**（残件から参照）。

## 設計の要（動かせない制約）

- **PLAN.md はパス・原則番号ともに生きた参照**: 他リポ14件の rag/INDEX.md が「dotagents/PLAN.md 原則10」、Kikoeru 監査が「原則8」、グローバル CLAUDE.md が「原則6・10」、MODELS.md が「原則1/6/9」を名指し。→ **ルートの PLAN.md をファイル名そのまま v4「憲章（趣旨＋原則＋運用）」に改稿**し、原則1〜10 の番号・骨子は不変。キャンペーン部（期限と前提・P0〜P7・波）だけ archive へ。
- **bin/sync-sweep.sh（全端末配布）が「PLAN.md P2 が正」を名指し** → P2 の恒久部分（掃引検査項目・削除の安全条件・「休眠は端末単位」）を v4 の「定常運用」節に圧縮移設し、スクリプトの参照を張り替える。
- **ADR 0002（docs/ 名はリネーム禁止）と正面衝突** → ADR 0003 で「キャンペーン終了により当該参照は失効」と部分 supersede し、0002 冒頭に注記を足す。

## 作業（TODO を兼ねる）

### 1. docs/archive/ 新設と移動（commit 1）

- [x] 本プラン正本を docs/PLAN_DOCS_REORG.md に配置（このファイル）
- [x] `git mv`: docs/{TODO,PENDING_OWNER,P3_GAP_LEDGER,P4_FLAGS_FOX,OTHER_TERMINAL_KICKOFF,SYNC_LEDGER}.md → docs/archive/
- [x] 現 PLAN.md 全文を docs/archive/PLAN-v3-fable-era.md として保存（v4 改稿前スナップショット）
- [x] 各ファイル冒頭に役目終了ヘッダ（終了日・全端末展開完了・現行の正へのポインタ）
- [x] 蒸し返し防止の最終処遇を明記: SYNC_LEDGER=「FOX 承認待ちテーブルは端末側で処遇済み・台帳未消し込みのまま凍結」／PENDING_OWNER=「Kikoeru GPL→Kikoeru リポで管理・grok/composer 非対話委譲→不要裁定〔aiterm で充足・2026-07-05〕」／P4_FLAGS_FOX=「flags は裁定・解決済み（2026-07-05 オーナー宣言）」
- [x] 相対リンク修正（TODO.md の ../PLAN.md → ../../PLAN.md・P4_PROMOTION_QUEUE → ../P4_PROMOTION_QUEUE.md、P3_GAP_LEDGER の PROJECT_LAYOUT.md → ../、PLAN-v3 内 docs/TODO.md → TODO.md）

### 2. PLAN.md v4 改稿＝趣旨文書（commit 2）

- [x] 構成: **趣旨**（開発工場の司令室＝規範・同期ハブ・知識台帳。v3 目的節の本旨と範囲を継承）／**原則1〜10**（番号・骨子不変）／**文書の作法**（3分類＋プラン規範3行＋「時間見積を判断材料にしない」存続——audit-gauntlet が参照）／**定常運用**（sync-sweep の掟・週次 agents-update・月次メモリ棚卸し＋rag Lint・世代交代=MODELS.md）／**残件（TODO を兼ねる）**／経緯
- [x] 残件節に転記（オーナー裁定 2026-07-05 で3件除外済み: Kikoeru GPL=Kikoeru リポが認識済み／FOX メモリ flags=解決済み／codex-sidecar への grok/composer 委譲=不要〔aiterm で充足〕）:
  - GitHub 側のみのリポ 20+件の終活裁定（判断材料も転記: 死亡宣言4リポ非公開化済み・非公開約30件は非公開のまま）
  - P4 昇格キューの消化（docs/P4_PROMOTION_QUEUE.md・各リポの次セッションで。全行消化で同ファイル削除）
  - npm Publishing access の 2FA 締め（任意）
  - Novel(forklore) 統合済みブランチ削除（ロック解除後）
  - Codex セッションでのスキル一覧目視確認（旧 P0-11 残）
  - permission allowlist 横展開（オーナー確認後）
  - この Mac の端末メモリ→リポ昇格の実施確認（旧 P4 昇格原則）
  - Throughline `.agents/`・WebAICoding `.playwright-mcp/` の .gitignore 追記（旧 P5 実施漏れ）
  - SmartClaude-UpdateTools の agents-update 統合裁定（任意）

### 3. 参照更新（commit 2 に同梱）

- [x] README.md L5・L12・L15: PLAN=憲章・TODO 表記撤去・ツリーに archive/ 追加／L71: polish-github 一本化済みに
- [x] docs/00_overview.md: 地図を live 文書（PLAN・PROJECT_LAYOUT・MODELS・settings.fragments・P4_PROMOTION_QUEUE・本プラン・adr/）＋archive/ 行へ全面書き換え
- [x] docs/PROJECT_LAYOUT.md L8・L27-28・L36・L71-73: 節参照の自己完結化・「進捗=docs/TODO.md」→プラン兼務・必須要件にプラン規範1行
- [x] claude/skills/orchestrate/SKILL.md L6・L69: P7 参照の解消
- [x] claude/commands/polish-github.md L5: 一本化済みに更新
- [x] bin/agents-update.sh L8: PENDING_OWNER 参照 → registry 運用確定を直書き
- [x] bin/sync-sweep.sh L5・L65-66: 「PLAN.md P2」→「PLAN.md 定常運用節」
- [x] docs/adr/0002 冒頭: 部分 supersede 注記／docs/adr/0003 新設（キャンペーン完遂→archive・プラン/TODO 統合の差し戻し理由・0002 失効範囲・掃引台帳はキャンペーン単位）
- [x] rag/second-brain/longterm-memory-tools-survey.md L22: 「進捗=docs/TODO.md」→「進捗=プラン文書（docs/・TODO 兼務）」

### 4. グローバル／プロジェクト CLAUDE.md（commit 3・diff をオーナー提示してからコミット）

- [x] claude/CLAUDE.md に新節「計画文書の作法」（3行セット）
- [x] claude/CLAUDE.md キャンペーン由来刈り込み（Fable/Opus/Sonnet 固有名→役割語＋MODELS.md 参照／「P7 ガードレール」→表現修正。実被弾日付・実績注記は残す。**7dcaf41 で入った他セッションの2行を保全**）
- [x] CLAUDE.md（プロジェクト）掟3 書き換え＋文書3分類の1行

### 5. FOX 発の dotagents 修正4件（commit 4・承認済み）

- [x] README.md L175: `"Finished"` → `"agents-update end"`（実ログ不一致の実バグ）
- [x] README.md L89: python3 判定を実行判定に（`python3 -c "print(1)"`）
- [x] bin/sync-sweep.sh L10: `hostname -s 2>/dev/null || hostname`
- [x] install.sh: MSYS 検出時のみ `MSYS=winsymlinks:nativestrict` 自動適用

### 6. 検証と収容

- [x] 着手前: git fetch → origin/main 照合（2026-07-05。3コミット ff 追従・P4_PROMOTION_QUEUE を計画に反映）
- [x] `bash -n install.sh bin/sync-sweep.sh bin/agents-update.sh`
- [x] `./install.sh` 再実行 → linked/SKIP 期待どおり・`./bin/verify-install.sh` OK
- [x] 参照残骸ゼロ: grep で旧文書名・「PLAN P[0-9]」のヒットが docs/archive/ 内と ADR・本プランの経緯記述のみ
- [x] 外部参照の生存: v4 に原則1〜10 の見出しが全て在ること
- [x] archive 内 md の相対リンク到達確認
- [x] pathspec コミット×4 → push
- [x] **完遂後: 本プラン自身を docs/archive/ へ移動して閉じる**（00_overview の地図からも外す）
