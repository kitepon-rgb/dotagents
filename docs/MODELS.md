# MODELS.md — 役割→現行最強モデルの対応表（唯一の参照点）

<!-- 前提: 2026-07-04 作成。バージョン固定禁止（PLAN 原則9）。モデル名をこの表以外に書き散らさない -->

方針: skill・agents・委譲契約・スクリプトは**役割名**でモデルを指し、具体名への解決はこの表だけが担う。モデル世代交代時は**この1枚の「解決例」列を更新して push すれば全端末が追従**する。更新トリガーはオーナーの宣言（PLAN 原則6——AI の劇的進化の時期はオーナーだけが観測・宣言できる）。

## 役割表

**委譲先の優先順位（レート予算の分散が最優先）**: 物量は **①Claude レート非依存の外部枠（Codex＝OpenAI・Grok Build/Composer＝xAI）を第一選択** → ②外部の性能が足りない時だけ Claude 内 `sonnet`/`haiku`（同じ Anthropic 枠を食う点に注意）。統括・裁定・契約クリティカルのみ上位 Claude。理由: 統括 Fable のレート窓は有限資源で、Claude 内モデルへの委譲はその枠を分け合ってしまう。

| 役割 | 使い所 | 解決規則（latest 型） | 2026-07-04 時点の解決例 |
|---|---|---|---|
| **統括** | 裁定・契約クリティカル・最終レビュー・コミット | その時点で使える最強推論＝Claude Code セッションの主モデル | Fable 5（2026-07-07 まで）。以後は Claude 最上位 latest |
| **実装（第一選択・レート非依存）** | 仕様が固まった実装・一括置換・機械的リファクタ | **Codex CLI（OpenAI 枠）** `codex exec` ／ **Grok Build/Composer（xAI 枠）** `grok --best-of-n`。Claude レートを食わない | `/Users/kite/.local/bin/codex`・`~/.grok/bin/grok` |
| **実装（次善・Claude 枠）** | 外部の性能が絶望的な時のみ | floating alias `sonnet`（claude/agents/implementer.md）。Anthropic 枠を消費 | Sonnet 5 |
| **軽作業** | 機械的分類・抽出・定型変換 | 外部が無ければ最安枠 `haiku` | Haiku 4.5 |
| **反証・検証** | 監査指摘の敵対的検証（refuter）・ultracode の verify | 強推論枠＝原則、統括モデルを継承（model 指定省略） | 統括と同じ |
| **第三者視点レビュー** | 仕様確定済みの独立レビュー | Codex `codex review`（Claude と別視点＋別枠の二重利得） | `/Users/kite/.local/bin/codex` |

## 指定の作法

- Claude Code 内では **floating alias（`sonnet` / `haiku` / `opus`）のみ使用**。日付付き model ID（`*-2025xxxx` 形式）を書いた時点で規約違反（バージョン固定＝腐る）。
- Agent / Workflow 呼び出しは**原則 model 指定を省略**（セッション主モデル継承）。下げてよいのは「仕様が固まった物量」だけ（PLAN 原則1）。
- 外部 CLI のバージョンは pin しない。CLI 自体は `agents-update`（週次）で latest 追従。

## 世代交代時の更新手順

1. オーナーが交代を宣言する。
2. この表の「解決例」列を更新して push（他の文書は役割名参照なので無修正で追従）。
3. `grep -rn "前提:" claude/ codex/ docs/` で前提行を列挙し、旧世代前提の資産を原則6で再検討（残す／作り直す／廃止の提案→オーナー承認）。
