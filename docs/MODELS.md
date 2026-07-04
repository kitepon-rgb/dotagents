# MODELS.md — 役割→現行最強モデルの対応表（唯一の参照点）

<!-- 前提: 2026-07-04 作成。バージョン固定禁止（PLAN 原則9）。モデル名をこの表以外に書き散らさない -->

方針: skill・agents・委譲契約・スクリプトは**役割名**でモデルを指し、具体名への解決はこの表だけが担う。モデル世代交代時は**この1枚の「解決例」列を更新して push すれば全端末が追従**する。更新トリガーはオーナーの宣言（PLAN 原則6——AI の劇的進化の時期はオーナーだけが観測・宣言できる）。

## 役割表

| 役割 | 使い所 | 解決規則（latest 型） | 2026-07-04 時点の解決例 |
|---|---|---|---|
| **統括** | 裁定・契約クリティカル・最終レビュー・コミット | その時点で使える最強推論＝Claude Code セッションの主モデル | Fable 5（2026-07-07 まで）。以後は Claude 最上位 latest |
| **実装** | 仕様が固まった実装・テスト作成・逐語移設・一括置換 | 安価高速枠。floating alias `sonnet`（claude/agents/implementer.md が使用） | Sonnet 5 |
| **軽作業** | 機械的分類・抽出・定型変換 | 最安枠。floating alias `haiku` | Haiku 4.5 |
| **反証・検証** | 監査指摘の敵対的検証（refuter）・ultracode 監査の verify | 強推論枠＝原則、統括モデルを継承（model 指定省略） | 統括と同じ |
| **外部併走①** | 第三者視点レビュー・仕様確定済みの機械的一括 | Codex CLI（`codex exec` / `codex review`）。モデル解決は CLI 既定に委ねる | `/Users/kite/.local/bin/codex` |
| **外部併走②** | best-of-N 生成・自己検証つき実装 | Grok Build（`grok --check` / `--best-of-n N`）。Grok / Composer の選択も CLI 既定 | `~/.grok/bin/grok` |

## 指定の作法

- Claude Code 内では **floating alias（`sonnet` / `haiku` / `opus`）のみ使用**。日付付き model ID（`*-2025xxxx` 形式）を書いた時点で規約違反（バージョン固定＝腐る）。
- Agent / Workflow 呼び出しは**原則 model 指定を省略**（セッション主モデル継承）。下げてよいのは「仕様が固まった物量」だけ（PLAN 原則1）。
- 外部 CLI のバージョンは pin しない。CLI 自体は `agents-update`（週次）で latest 追従。

## 世代交代時の更新手順

1. オーナーが交代を宣言する。
2. この表の「解決例」列を更新して push（他の文書は役割名参照なので無修正で追従）。
3. `grep -rn "前提:" claude/ codex/ docs/` で前提行を列挙し、旧世代前提の資産を原則6で再検討（残す／作り直す／廃止の提案→オーナー承認）。
