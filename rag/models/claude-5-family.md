<!--
source: https://platform.claude.com/docs/en/about-claude/models/choosing-a-model
        https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-8
        https://platform.claude.com/docs/en/build-with-claude/effort
        https://platform.claude.com/docs/en/about-claude/pricing
        https://www.anthropic.com/news/claude-sonnet-5
fetched: 2026-08-11
confidence: 高（Anthropic 一次資料）。価格表の Sonnet 5 将来価格だけは古い表示が残るため、
  2026-08-10 の新しい公式 changelog を優先する。
-->

# Claude 5 ファミリー（Fable / Opus / Sonnet）と Haiku 4.5

## 現行の選択肢

| model | 位置づけ | 標準 API 価格（入力/出力、per Mtok） | effort の出発点 |
|---|---|---|---|
| Claude Fable 5 | 公開モデル中の最高能力・長期 agent | $10 / $50 | high。能力感度が高い時だけ xhigh |
| Claude Opus 5 | 複雑な agentic coding・enterprise work | $5 / $25 | high。難しい coding/agentic work は xhigh |
| Claude Sonnet 5 | coding・agent・tool use を量産できる中位 | **$2 / $10** | medium を費用対効果の起点にできる |
| Claude Haiku 4.5 | 高速・大量・軽量 subagent | $1 / $5 | low |

Claude Code では日付付き ID を固定せず、dotagents の規約どおり `fable` / `opus` / `sonnet` / `haiku` の floating alias を使う。API の model ID は別の versioning 契約である。

## 2026-08-11 の更新判断

- **通常上位を Opus 4.8 から Opus 5 へ更新**。Anthropic は Opus 5 を Opus 4.8 からの step-change とし、深い推論、長期 agentic task、複数ファイル実装、review、追加 effort の効きに強みがあるとしている。
- **Sonnet 5 の $2/$10 は恒久価格**。Anthropic は 2026-08-10 に、9月から $3/$15 とする予定を撤回した。platform の pricing/model overview には旧予定が残っているが、日付が新しい公式 changelog を正とする。
- Sonnet 5 は Opus 4.8 に近い性能帯と説明され、medium effort の費用対効果が高く、高 effort では一部 task で Opus 4.8 相当。ただし新 tokenizer により同じ入力が旧世代の約1.0〜1.35倍の token になるので、request 単価は nominal rate だけで比較しない。
- Opus 5 は high が既定。xhigh は長時間の難しい coding/agentic work、max は token 支出を制限しない価値がある時だけ使う。Fable 5 と Sonnet 5 も effort を持つため、モデル変更と effort 変更を別々の eval 軸として扱う。

## dotagents への含意

- Claude 枠の通常実装・finder の第一候補は Sonnet 5。持続的 tool use を伴う実装レーンにも置ける。
- 契約クリティカルな設計・長期の複雑実装は Opus 5。最高能力が本当に必要な一点だけ Fable 5 をスポットで呼ぶ。
- provider 間 benchmark は harness・token budget・価格前提が揃わないため、順位表を配置正本にしない。実際の repo task で成功率、総 token、所要時間、手戻りを測る。
- 2026-08-11 の複数 benchmark snapshot と限界は [[benchmark-snapshot-20260811.md]] に分離した。

## 関連

- [[../../docs/02_models.md]] — 役割→ティア×effort の正本
- [[gpt-5.6-family.md]] — Codex レーンの現行ファミリー
- [[xai-grok45-composer25.md]] — xAI レーン
