# ADR 0004: docs/ の命名規約（連番正典・接頭辞付き一時文書・日付付きアーカイブ）

日付: 2026-07-05

## Context

再編（[0003](0003-campaign-close-plan-todo-merge.md)）後も docs/ の名前は UPPER_SNAKE（`MODELS.md`・`P4_PROMOTION_QUEUE.md`）・dotted（`settings.fragments.md`）・連番（`00_overview.md`）が混在し、「雑多に積んだ」見た目だった（オーナー指摘 2026-07-05）。0002 のリネーム禁止根拠は 0003 で失効済み。**外部リポからの名指し参照はゼロを grep で実測**——対象名の参照は全てリポ内（グローバル CLAUDE.md・skill・agents 含む）＝1コミットで原子的に更新できた。

## Decision

1. **恒久正典 ＝ `NN_` 連番・小文字ケバブ**（番号が読む順）: `00_overview` / `01_project-layout` / `02_models` / `03_settings-fragments`。
2. **一時文書 ＝ 種類接頭辞**: `plan_<topic>.md`（プラン＝TODO 兼務）・`queue_<topic>.md`（作業キュー）。完遂で archive へ。キャンペーン専門用語（P4 等）はファイル名に入れない。
3. **archive 内 ＝ `YYYY-MM_<name>.md`**（小文字ケバブ・時系列に並ぶ）。
4. **root の `PLAN.md`・`README.md`・`CLAUDE.md` は不変**（PLAN.md は他リポ14件が名指しする生きた参照。後2者は生態系標準名）。
5. 本規約は全プロジェクト標準（[01_project-layout.md](../01_project-layout.md)）にも収録する。

## Consequences

- `ls docs/` だけで種類（正典／一時／歴史）と読む順が分かる。
- 0002 の決定（既存名の維持）は本 ADR で置換。0002 の原則「生きた参照を壊さない」は、リネーム前の参照 grep 実測と PLAN.md 名の維持として存続。
- 他端末の端末メモリに残る旧名参照は失効するが、00_overview（地図）が現行名へ誘導する。
