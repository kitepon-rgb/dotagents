# 02_models — 役割→モデル×エフォートの決定表（唯一の参照点）

<!-- 前提: 2026-08-14 更新（Claude 5 / GPT-5.6 / Grok 4.6 世代）。バージョン固定禁止（PLAN 原則9）。モデル名をこの表以外＋公認例外（codex/agents/*.toml・.codex-sidecar.yml）に書き散らさない -->

方針: skill・agents・委譲契約・スクリプトは**役割名**でモデルを指し、具体名への解決はこの表だけが担う。世代交代時は**この1枚＋公認例外2種を更新して push すれば全端末が追従**する。更新トリガーはオーナーの宣言（PLAN 原則6）。

背骨: **判断はティアで買い、粘りは effort で買う。ただし、現状維持に候補側だけの立証責任を負わせない。** 新しい有力候補は、失敗を観測できる代表実務へ期限・範囲を切って投入し、成功率・手戻り・監査工数・総token・所要時間・quotaで現役と比較する。未検証の現役を「安全」、未検証の新顔を「危険」とは扱わない。昇格も降格も実測で行う。

本書の根拠は次の4種を混ぜない。

1. **一次事実**: vendor公式の価格、context、対応effort、live catalog。
2. **外部観測**: benchmark、Xの利用報告、独立評価。harness・標本数・再現条件を併記する。
3. **dotagents実測**: 当工場のtask、監査通過率、配線実測。一般性能へ拡張しない。
4. **運用判断**: 上記を踏まえた配置。客観的に確定した事実を「オーナー裁定」と呼ばない。

**親のモデル×effortはオーナーの領分**であり、規範・AIはピンを打ち替えない。親候補と根拠は提示し、子の配置はこの表で解決する。

## 消費枠（4つ。独立性とrate予算を同時に使う）

| 枠 | 入口 | 特徴 |
|---|---|---|
| Anthropic | Claude Code本体・Agent/Workflow・`sonnet`/`haiku` | 長期agentと設計対話。有限quotaを実装物量だけで焼かない |
| OpenAI **Codex** | Codex CLI・codex-sidecar MCP・Codex native子 | repo密結合実装と反証の第一柱 |
| OpenAI **ChatGPT** | **gpt-connector**（MCP ID `gpt_connector`・API fallback禁止） | Codex枠と別勘定。実読不要の純推論・second opinion |
| xAI | Grok Build・aitermのgrok/composer agent | 独立した第三provider。X調査、統括、反証、実装の実戦候補 |

## ティア語彙（この表だけがモデル名を持つ）

| ティア | 解決規則（latest型） | 2026-08-14時点の解決例 | API定価（入力/出力、per Mtok） |
|---|---|---|---|
| Claude 主 | セッション主モデル（委譲時も同値aliasを明示） | オーナー指定（現行の通常上位は Opus 5） | Opus 5: $5/$25 |
| Claude 最上位 | floating alias `fable` | Fable 5 | $10/$50・スポット限定 |
| Claude 上位 | floating alias `opus` | Opus 5 | $5/$25 |
| Claude 中位 | floating alias `sonnet` | Sonnet 5 | **$2/$10（恒久価格）** |
| Claude 軽量 | floating alias `haiku` | Haiku 4.5 | $1/$5・effort指定なし |
| Codex 旗艦 | OpenAI現行旗艦 | `gpt-5.6-sol` | $5/$30 |
| Codex 中位 | OpenAI現行バランス枠 | `gpt-5.6-terra` | $2/$12 |
| Codex 軽量 | OpenAI現行軽量枠 | `gpt-5.6-luna` | $0.20/$1.20 |
| xAI 旗艦 | xAI現行旗艦 | `grok-4.6` | $2/$6（200K超は$4/$12） |
| xAI coding | Grok Build live catalogのComposer | **現時点は利用不可**。Composer 3移行準備の可能性はあるがslug・公開日は未確認 | catalog不在。Grokへfallbackしない |

価格は標準API定価であり、Claude Code・Codex・Grok Buildのsubscription quotaとは別物。Sonnet 5の$2/$10恒久化、各社の対応effort、Grok 4.6の長context価格は一次資料で確認する。根拠は [GPT-5.6](../rag/models/gpt-5.6-family.md)、[Claude 5](../rag/models/claude-5-family.md)、[Grok 4.6](../rag/models/xai-grok46.md) に置く。

### Grok 4.6をどう読むか

xAI公式値では agentic office task と複数のcoding/agent benchmarkでSol/Opus級と競り、DeepSWEとTerminalBenchでは下回る。独立したsmart-contract監査ではSolよりF1が低い一方、固有の有効発見数は僅かに多かった。Xには強い統括・review・長時間実装の成功例と、security誤判定・部分読みによる完了誤認・思考loopの失敗例が併存する。したがって「監査に不向き」でも「何でも単独で任せられる」でもない。**独立providerの実戦候補として使い、契約クリティカルな最終受入はcross-providerで閉じる**のが現在の結論である。

## 決定表（役割→ティア×effort×入口）

### provider配置の原則

- **Observerは親と同じprovider family**: 伴走と継続観測の役であり、独立反証票へ数えない。
- **相談・反証は異なるproviderを優先**: Codex親はClaudeまたはGrok、Claude親はCodexまたはGrokを候補にする。Grokを恒常的な補欠へ固定しない。
- **Phase検証はcross-provider**: 契約クリティカルな完了は、成果providerと異なるproviderが実物を1回検証し、統括が採否を裁定する。Grok 4.6はこの反証役の現役候補である。
- **役割と配置関係の機械可読な対応**は`lib/orchestrate/placement-policy.mjs` v1が固定する。自動ConsultationはAnthropic/OpenAIだけだが、これは現行配線のclosed enumであり、xAIの能力評価ではない。xAIはAitermの明示laneで使う。

| 役割 | Claudeレーン | Codexレーン | xAIレーン | ChatGPTレーン |
|---|---|---|---|---|
| 統括・会話（親） | **オーナー指定** | **オーナー指定** | **Grok 4.6×highを実戦候補**。利用面が親を許す時に代表campaignへ投入し、親pinはオーナーが決める | — |
| 裁定・契約クリティカル | 主直轄。必要時だけ`fable`をスポット諮問 | 旗艦×high以上 | 旗艦×highを敵対的な裁定材料に使う。単独最終票にはしない | 純推論の裁定材料にconsult可 |
| 最新情報・Xの事実探索 | `sonnet`（X直結でない時の補助） | Web調査の独立確認 | **旗艦×low**で投稿・日時・原文を回収、**medium**で複数投稿と一次資料を統合 | — |
| 監査・発見（finder） | `sonnet`×low | 中位×medium・codex_auditor/explore | **旗艦×medium**。数を出す発見とX裏取り | — |
| 反証・検証（リポ実読あり） | 主同値×high・refuter。契約criticalは`fable`×highをスポット使用。**親がFableの時はxAIレーンを第一候補**とする（オーナー裁定 2026-08-15） | 旗艦×high・refuter/codex_risk_check | **旗艦×high**・cross-provider refuter。根拠行と再現を必須化。Fable親の反証は本レーンが第一候補（OpenLogicool計画監査で実戦受入: 固有発見6/13件・一次資料裏取りあり） | — |
| second opinion（実読不要） | — | — | **旗艦×medium**。実務判断と最新情報を含む別視点 | **第一選択**: `gpt_connector`（[06_gpt-connector.md](06_gpt-connector.md)） |
| 設計（並列Plan） | 主同値×medium〜high | 旗艦×medium | **旗艦×high**。統括候補と同じく境界・停止判断を評価 | 設計意見の別視点 |
| 実装物量 | `sonnet`×medium | 中位×medium・implementer。**親がFableの時は中位×high（Aiterm入口）を既定**とし、親自身は裁定・受入・慎重作業だけを直轄する（オーナー裁定 2026-08-15） | **Grok 4.6×medium**を仕様固定の比較基準、repo横断・長時間agentはhigh。Composerはcatalog復帰まで不使用 | — |
| 局所coding（focused testあり） | `sonnet`×medium | **Luna×max**。探索・設計判断を混ぜない | Grok 4.6×medium | — |
| 軽作業・分類・抽出 | `haiku`（effortなし） | **Lunaを使うならmax**・sorter。maxが割に合わない時は別モデル | Grok 4.6×low | — |
| 第三者review | 主×medium | 旗艦×medium（critical差分はhigh） | **Grok 4.6×high**を積極投入。契約criticalは別provider受入 | 貼付可能規模なら併用可 |

### 入口と使い分け

- **Codex親の三レーン**: ① native subagent＝repo密結合、② external execution＝codex-sidecar/aiterm、③ consultation＝gpt-connectorを分ける。Grok/ComposerはAitermの別vendor laneであり、Codex→Codexの入口判断とは別契約。
- Aitermの`codex_agent`/`grok_agent`/`composer_agent`はmodelとeffortを毎回明示する。Grok 4.6はlow/medium/high/xhighを受ける。live catalog不在・effort非対応は明示エラーにし、別modelへfallbackしない。
- Composerのadapter・test・入口は削除しない。2026-08-14時点のlive catalog不在だけを注記し、Composer 3のslug・公開日・effortは公式確認後に更新する。
- **委譲の安全・回収・受入契約は[委譲契約](../shared/orchestrate/delegation-contract.md)が正本**。external writerはinstalled→registered→verified→execution-verifiedの最終段だけに置き、Aitermの運用型は[aiterm-dispatch](../shared/orchestrate/aiterm-dispatch.md)を正とする。
- codex-sidecarはmodel/effortを毎回明示するか`.codex-sidecar.yml` defaultsへ置く。現行schemaはlow〜xhighでmaxを渡せないため、Luna×maxの実行入口にしない。

## effortの規範

effortは単調に品質を上げない。高effortで探索が増え、scope creep、timeout、思考loop、quota消費が増えるmodel/taskがある。まず役割に合うpresetへ置き、同じ代表taskで隣接levelを比べる。失敗後に変えるのはmodel tierかeffortの片方だけにする。

| model | 出発点 | 上げ下げの規律 |
|---|---|---|
| Opus 5 | **medium**（工程が限定された実装・review）、**high**（長期agent・複雑設計） | xhigh/maxは長時間の知識仕事で測定差が出た時だけ。権限境界が緩い工程へ高effortで置かない |
| Fable 5 | high | 契約criticalのスポット。常用親と同義になる使い方はしない |
| Sonnet 5 | medium | finderの字面回収だけlow。高effortは代表taskで差が出た時 |
| Haiku 4.5 | effortなし | 存在しない`haiku×low`を指定しない |
| Sol/Terra | medium | high/xhighは測定可能な品質差がある時。maxは最難関quality-first。ultraはCodex harnessのmax＋自動fan-outであり明示要求時だけ |
| Luna | **maxのみ** | dotagents実測ではmedium以下の監査通過率が低く、再監査コストが増えた。Lunaを使う仕事はmaxへ置き、maxが過剰ならLunaのeffortを下げず別モデルを選ぶ |
| Grok 4.6 | low=X/字面回収、medium=統合調査・scope固定実装、high=統括・反証・長時間agent | xhighは思考loopと遅延の外部報告がある。代表taskでhighを上回った時だけ使う |

Lunaの規定は**dotagentsの実測から導いたローカル運用**であり、OpenAI公式の一般推奨ではない。Opusのscope creepも外部報告と独立benchmarkが示すtask依存傾向であり、個々の失敗を普遍的性格へ一般化しない。根拠の確度と出典はRAGに置く。

## 指定と世代交代時の更新手順

- Claude Code内はfloating alias（`fable`/`opus`/`sonnet`/`haiku`）だけを使う。Agent/Workflowのmodelとeffortは対応する場合に毎回明示し、Haikuへeffortを付けない。
- Codexにfloating aliasがないため、`codex/agents/*.toml`と`.codex-sidecar.yml`は具体slugを持つ公認例外。世代交代時は本書と同一commitで更新する。
- 外部CLIはpinせず`agents-update`でlatest追従する。model live catalogは実行直前に見る。
- オーナーの世代交代宣言後、`grep -rn "前提:"`で影響面を列挙し、本書、公認例外、focused fixture、RAGを同時更新する。新規候補は小さな実戦比較を行い、失敗も次の配置判断へ残す。
