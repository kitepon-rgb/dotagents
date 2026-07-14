---
name: orchestrate
description: 多エージェント/多モデル統括の標準型（2026-07 NoveLore 全域リファクタ・監査156体/21コミット/本番デプロイ事故0で実証）。複数フェーズ or 並列分解が利くタスク（全域監査・大規模リファクタ・移行・複数領域の実装・調査網羅）に着手する前に必ず読む。トリガー例：「リファクタ」「監査」「全域」「大規模」「移行」「オーケストレーション」「複数エージェント」「ultracode」「徹底的に」
---

<!-- 前提: Fable級統括（2026-07 実証時点）。統括が最上位級でない場合の運用は本書「ガードレール常時ON」節に収録済み。役割→モデルの対応は dotagents/docs/02_models.md が正（バージョン固定禁止＝PLAN 原則9） -->

# Orchestrate — 統括の標準型

まず[共通契約](../../../shared/orchestrate/contract.md)と[委譲契約](../../../shared/orchestrate/delegation-contract.md)を全文読む。使う時・使わない時、同期、安全網、反証、Packet/Report、レーン分離、独立完結、知識還流、F/A/H、Control lifecycle、フェーズ、統括ゲートは共有文書が正本である。この本文は Claude 固有の appendix として読む。

## Claude appendix（既存の運用詳細）

以下はClaudeのWorkflow / Agent / codex-sidecar / aitermを使う場合の固有入口と配置強化策である。共通原則の二重管理はせず、製品中立の判断は上の共通契約に従う。

Claude appendixは、Claude固有入口から得たstatusをControlへ投影するだけである。Claude内部の共通dispatch API、Executor state複製、新規operational admissionを前提にしない。既存manifestの定義・所有は変更しない。

## Claude 固有の運用

- 同期確認には `sync-sweep` を使う。端末横断リポの照合、dirty、stash、迷いブランチ、NO_REMOTE を明示してから着手する。
- Claude の委譲は[共有の委譲契約](../../../shared/orchestrate/delegation-contract.md)と[Workflow 雛形](references/workflow-templates.md)を参照する。

## 知能の配置

| 層 | 担当 | 実行手段 | モデル |
|---|---|---|---|
| L0 統括 | 裁定・契約クリティカル（認可/tx/公開API互換/依存方向/本番操作）・履歴修復・コミット・最終責任 | 本人 | セッション主モデル |
| L1 監査・検証 | 発見→重複統合→**指摘ごとの反証**→網羅性Critic（盲点→第2ラウンド） | Workflow（`references/workflow-templates.md`） | 省略=主モデル継承（検証の精度優先）。数で押す finder は sonnet 可 |
| L2 設計 | 2〜4視点の並列設計（実行順序/配置/取捨 等）→**割れは統括が根拠で裁定**（多数決禁止） | Agent (Plan) | 主モデル継承 |
| L3 実装 | 仕様が固まった実装・テスト作成・逐語移設・整理 | **まず外部枠 codex-sidecar の `codex_work`（隔離 worktree・Claude レート非依存）**、次善で Agent/Workflow `model: sonnet`（機械的なら haiku） | 外部枠優先→sonnet |
| L4 外部CLI | 完全固定仕様の機械的一括・第三者視点レビュー | 非対話＝codex-sidecar の `codex_review`/`codex_work`/`codex_generate` 等／対話＝aiterm の `codex_agent`・`grok_agent`・`composer_agent` | レート非依存＝第一選択（02_models.md） |

**レート予算**: L0 統括（Claude）の窓は有限資源。物量は L4 外部枠（Codex/Grok＝Claude レート非依存）を第一選択にし、Claude 内 sonnet/haiku は外部の性能が足りない時の次善（同じ Anthropic 枠を食う）。これは共有最低契約に対するClaude固有の配置強化策であり、詳細は docs/02_models.md。
**継承の罠（最上位張り付き防止）**: Agent/Workflow の model 省略は親モデル継承＝親が最上位だと全子が最上位に張り付く。省略が許されるのは検証・反証・裁定系（L1 verify/Critic・L2・refuter）のみ。finder・dedup・整形・L3 物量は `model`（sonnet/haiku）と `effort: low` を明示する（配置の既定と effort ゲートは docs/02_models.md）。

## 協業ループ（Claude⇄外部AI・aiterm PTY で回す）

「設計→レビュー→再設計」を外部AI（Codex/Grok）と往復させる型。基盤は aiterm 永続PTY（`mcp__aiterm__pty_*`）＝tmux ペインの read/type/keys で、smux 等の外部ツールは不要（機能重複・rag/orchestration/smux-terminal-agent-mesh.md）。

- **片方向レビュー**: codex-sidecar の `codex_review`（非対話）で Codex にレビューさせる → **統括が指摘を敵対的裁定**（生き残りだけ採用）→ 統括が修正・コミット。実証: 2026-07-04 ランブックレビューで Codex が verify-install の実バグを発見。
- **往復**: 修正後に再度 `codex_review` で確認。**1往復ごとに統括が裁定**する（全自動対話にしない＝品質 > 自動化）。第三者視点（別モデル・別レート枠）と敵対的検証を同時に得る。対話で詰めたい時は aiterm の `codex_agent`/`grok_agent`/`composer_agent`。

## 標準エージェント（~/.claude/agents に定義済み）

- **implementer**（sonnet）: 委譲契約を焼き込んだ標準実装者。契約の共通部を毎回書かなくてよい。
- **refuter**（主モデル継承・読み取り専用）: 敵対的検証者。指摘/計画/主張を実ファイルを読んで殺しにかかる。

## ガードレール常時ON（統括が最上位級でない場合に備える）

統括が Opus/Sonnet 5 等（Fable より弱い世代）の時に品質を保つ追加ガードレール。統括は自分の知能レベルを確証できない（実行中の実モデルは AI から見えない）ので、下記は「格下時だけ」でなく、**契約クリティカル・監査確定・不可逆操作では常時ON**にする（品質を統括モデルの当たり外れに依存させない）:

- **検証2票制**: 監査指摘・重要判断は refuter 1票でなく独立2票（existence＝事実か／value＝直す価値があるか）を必須化。両方生き残ったものだけ採用。
- **裁定は棄却側へ倒す**: 確信が持てない指摘・提案は棄却する（もっともらしいだけの大改造を通さない。迷ったら殺す）。
- **契約クリティカルは自己実装前に refuter を1回通す**: 認可・tx・公開API互換・依存方向・本番操作は、着手前に「この設計は安全か」を refuter に殺させてから。
- **エスカレーション裁量**: 委譲物に納得しなければ上位（Opus → 最上位 latest）へ引き上げてよい。安さは品質の人質ではない。
- **配置はゲートで宣言**: 着手ゲート（F/A/H）と同時に（ティア, effort, 入口）を1行宣言。02_models.md の決定表の既定から上振れする方（上位ティア・xhigh 以上・ultra・物量への主モデル継承）を要正当化にする。配置に迷ったら安い方・採用に迷ったら棄却。

## Claude 固有の参照

- 委譲プロンプトの雛形: [共有の委譲契約](../../../shared/orchestrate/delegation-contract.md)
- Workflow スクリプト雛形（敵対的監査・一括整理）: `references/workflow-templates.md`
- 役割→現行モデルの対応: `dotagents/docs/02_models.md`（バージョン固定禁止・外部枠優先・エスカレーション裁量）
- 出自と実測: NoveLore 全域リファクタ（Novel プロジェクトの記憶 `forklore-refactor-2026-07`）
