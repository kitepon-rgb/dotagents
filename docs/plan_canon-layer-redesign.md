# 規範の層モデル再設計 — 提案書（r2）

- Status: 実行中——**wave 0完了**（受け皿5面・runbook配布・manifest検査・`7570b95`）／
  **wave 1完了**（矛盾6家系解消・反証3巡14commit・`50d12e4`配布済み）／wave 2着手（2026-08-02 GO）
- 旧Status: オーナー裁定待ち（4点）
- Date: 2026-08-02
- 目的: 「意図どおりAIが動くこと」を、矛盾解消と常時ロード面スリム化の同時手術で実現する。
- 経緯: 項目パッチ方式は[凍結](plan_canon-zerobase-audit.md)。r1提案書はワークシート作者による
  反証でNO-GO（8 finding・全採用）→本r2。r1の主な欠陥: 節別要約がワークシートを歪めて要約・
  受け皿1件欠落・予算の算数崩れ・**移行中にsymlink配布面へ未受入規範が露出する構造穴**・
  gate能力の過大表現。
- 入力: ゼロベース監査4系統＋反証済み[ワークシート539行](plan_canon-layer-redesign-worksheet.md)
  （1規則1行・5分類・受け皿実在確認・gate接触125箇所を[gate:parity]/[gate:exact]で区分）。
- 確定裁定の引き継ぎ: P1採用（push既定の条件付き一本化）・P2採用（F/A/H統括限定）。

## 設計の要点（3行）

1. 規則は**3層に一度だけ**: L0常時ロード=判断トリガーと肯定制限文だけ／L1起動時=局面契約／L2オンデマンド=手順・詳細。
2. **実runtime常時payloadは18.3千字→約5.6千字（約69%減）**。論理corpus（PLAN含む）は23.7千→7.2千字。
   規則は消えない——移設は`source→L0ポインタ→受け皿`のmanifestで機械検査する（parityでは
   「規則の消失」を検出できないため専用checkを敷く）。
3. 矛盾（凍結台帳P1〜P8）は**矛盾familyごとに全読者面を同一commit・同一gate・同一push**で解消する
  （文書別waveに切ると矛盾した中途状態が配布される——反証F6）。

## 層と配布面（新インフラは作らない）

| 層 | 中身 | 配布面（全て既存機構） |
|---|---|---|
| L0 | 判断トリガー・肯定制限文・人格・所有境界 | 憲法正本→generator→両host生成物→symlink／project正典 |
| L1 | 統括・委譲・publish等の局面契約 | orchestrate skill既定の全文読み＋正典内の「◯◯の前に△△を読む」導線 |
| L2 | 手順詳細・例外・経緯・実例 | 各所有repoのdocs・ADR・新設runbookへのポインタ |

## 新設する受け皿（6面・全てdotagents所有 `shared/runbooks/`）

1. `lattice-workflow.md` — 工程正本判定・cutover・run運用（憲法46-55・PLAN32-33・delegation:18詳細）
2. `knowledge-return.md` — RAG還流六手順・raw/コンパイル分離・INDEX規約・**月次衛生（RAG lint・memory棚卸し）**（F3で移管）
3. `git-hygiene.md` — rsync dry-run・grep単独禁止・repo終活安全判定・sync-sweep詳細
4. `canon-authoring.md` — 判断だけ正本化・肯定制限文・共通は共通面へ・**規範変更時の読者面実測義務**
5. `reporting.md` — task ID日本語化・3秒理解の見せ方
6. 割当の完全表はワークシートが正（48件中47件は上記1-5、残る`constitution:28`は下記の上書き裁定でL0残留）

## ワークシートからの設計側上書き裁定（2件だけ・他は提案列が正）

- `constitution:46-55`全10行はワークシートどおりL2へ移すが、**トリガー1行**
  「工程を読む/作る前に`lattice status --json`で正本を判定する（詳細はlattice-workflow）」をL0に残す
  （runbookを読む契機自体はL0に無いと発火しない）。
- `constitution:28`（正規APIの直接利用は迂回でなく正攻法）はL0残留1行——五原則4の誤読
  （回避との混同）を防ぐ対になっており、単独でL2へ落とすと原則4が過剰禁止側へ誤読される。

## L0に残るもの（節別・ワークシート提案列から機械再生成）

- 人格・応対規範: ほぼ全残
- 五原則: 全残・圧縮（P1裁定をここで適用）
- 調査と知識の置き場: caveat/rag先行検索・最新根拠・確信なき指摘棄却・**focused/related/full testの3規則**・還流トリガー（P7のscope限定形）＋knowledge-returnポインタ
- 計画文書の作法: 正本化ゲート統括限定・Lattice明示適用・typed discoveryトリガー1行＋lattice-workflowポインタ
- 作業レーンと統制・ツールと権限: ほぼ全残
- git鉄則: 実被弾トリガー行残し・手順詳細はgit-hygieneへ
- 報告・出力衛生: トリガー行残し・見せ方詳細はreportingへ
- AGENTS.md: 所有境界宣言＋掟＋（**配置規約表はワークシートどおりREADMEへ**——参照表でありトリガーでない）
- PLAN.md: 原則番号・骨子は不変。各原則の本文詳細をrunbookへ移し骨子行だけ残す

## 文字数予算（F4/F5補正・裁定事項）

**runtime常時payload**（自動ロードの実測面）と**論理corpus**を分離して予算化:

| 面 | 現状 | 移行後試算 | 予算案 |
|---|---:|---:|---:|
| 憲法生成物（=正本） | 7.1千字 | 約3.9千字 | ≦4.5千字 |
| リポ直下AGENTS.md | 11.2千字 | 約1.7千字 | ≦2.5千字 |
| **runtime計** | **18.3千字** | **約5.6千字（69%減）** | **≦7.0千字（62%減保証）** |
| PLAN.md（リンク参照・非自動） | 5.4千字 | 約1.6千字 | ≦2.0千字（個別） |

機構: render時にwc検査→`make lint`で警告（FAIL昇格は運用実績後に再裁定）。

## 移行の実行規律（反証F7/F8を反映）

- **各waveは隔離worktreeで完遂**する: source置換→generator再生成→exact文言追従→
  migration manifest検査→refuter→全gate green→親受入→**mainへのfast-forward一回**で配布面へ反映。
  symlink配布面に未受入状態を露出させない。
- **wave 0（受け皿新設）は未参照の骨格まで**に限定（L0からのポインタはまだ張らない＝二重存在期間も
  読者面は不変）。
- **migration manifest**: 移設行ごとに`source行→L0ポインタ→受け皿行`を記録し、対象存在・リンク到達・
  必須句保持を検査する小型checkをtests/へ同waveで敷く（parityは規則消失を検出できない——F8）。

## wave構成（矛盾family優先・F6反映）

- wave 0: 受け皿6面の骨格新設＋manifest check敷設（読者面不変）
- wave 1: **矛盾family解消**——P1(push)・P5(plan粒度)・P7(還流scope)・P3/P8(model明示)を、
  familyごとに全読者面（憲法・PLAN・contract・SKILL・templates・README）同一commitで
- wave 2: 憲法の節単位L2移設（計画作法→調査知識→git鉄則→報告）
- wave 3: AGENTS.md・PLAN.mdの厚み移設
- wave 4: L1契約細部のL2化＋予算lint敷設＋凍結台帳Tier 2の個別起票

## 外部到達性の保証（2026-08-02オーナー制約「本プロジェクト外・他端末から参照不能になる事態を

起こすな」の実装）

1. runbookは`~/.claude/runbooks/`・`~/.codex/runbooks/`のsymlink面で全端末へ配布
   （install.shへ`shared/runbooks/`の1エントリ追加——skills/binと同じ既存機構）。
   L0のポインタはこのhome基準パスで書き、標準repo配置も併記して二重化する。
2. verify-installへrunbook symlinkの実在・行き先検査を追加（他端末の欠落を機械検出）。
3. migration manifest検査に「L0トリガー行→受け皿のリンク到達」を含める。
4. commit順序: 受け皿が先・ポインタは後。どのcommit時点にも「ポインタだけあって行き先が無い」
   状態を存在させない（pull途中の端末も安全）。

## 裁定を求める点

1. 層モデル・受け皿6面・上書き裁定2件 【裁定: 採用（2026-08-02・方向承認）。制約: 外部到達性の
   保証を上記のとおり機械化すること】
2. L0残存の節別方針 【裁定: 採用（2026-08-02）。条件: 矛盾解消（wave 1）が移設に先行すること】
3. 予算数値と警告方式 【裁定: **棄却**（2026-08-02）——文字数制限は導入しない。「必要なことを
   最低限の文字数で表現する」を執筆規律としてcanon-authoringへ置き、規範変更のレビュー観点と
   する。試算値は目安の事実として残すがgateにしない】
4. wave構成（矛盾family先行・隔離worktree・manifest check） 【裁定: 採用・GO（2026-08-02）。
   品質指示: 規範文言はFable直筆（L0トリガー行・矛盾解消文）、逐語移設と配線コードはCodex委譲・
   Fable受入。文字数gateは裁定3どおり不採用、最小文字数表現をレビュー観点とする】
