---
name: orchestrate
description: 多エージェント/多モデル統括の標準型（2026-07 NoveLore 全域リファクタ・監査156体/21コミット/本番デプロイ事故0で実証）。複数フェーズ or 並列分解が利くタスク（全域監査・大規模リファクタ・移行・複数領域の実装・調査網羅）に着手する前に必ず読む。トリガー例：「リファクタ」「監査」「全域」「大規模」「移行」「オーケストレーション」「複数エージェント」「ultracode」「徹底的に」
---

<!-- 前提: Fable級統括（2026-07 実証時点）。統括が最上位級でない場合の運用は本書「ガードレール常時ON」節に収録済み。役割→モデルの対応は dotagents/docs/02_models.md が正（バージョン固定禁止＝PLAN 原則9） -->

# Orchestrate — 統括の標準型

まず [共通契約](../../../shared/orchestrate/contract.md) を全文読む。同期、安全網、反証、委譲契約、レーン分離、独立完結、知識還流、F/A/H、フェーズ、統括ゲートは同契約が正本である。この本文は Claude 固有の appendix として読む。

**中核思想: 品質は「モデルの賢さ」ではなく「構造」から出す。** 並列多視点・敵対的検証・安全網・委譲契約という構造が本体であり、統括モデルが替わっても構造は再現できる。統括（このセッションの主モデル）は裁定・契約クリティカル・ゲートに知能を集中し、物量は安価な知能に配る。

## 使う時・使わない時

複数Phaseまたは複数担当をまたぎ、resume、複数Executorの配置、競合・予算・監査・知識還流を一つの作業として管理する時に使う。対象projectの`docs/`にある生きた計画/TODOが正本であることを最初に確認する。

単一ファイル数十行程度の非クリティカル修正、単純な質問・読取・局所診断には、Control Recordを強制しない。ただし、既存active Controlに属する作業はこの除外にしない。

## Control Recordの最小lifecycle

1. docs正本を確認してからControlを`init`し、Taskを`task-record`、Worker RunまたはConsultationをそれぞれ`worker-run-record`または`consultation-record`で記録する。
2. Registry observationを記録し、`placement-dry-run`で候補を出す。親が候補を選び、`placement-reserve`でreservation proposalとして固定する。複数Runの完了を後続Taskの条件にする時は、親が`campaign-record`でmembers／gate／audit要否を宣言する。planned/admitted Workerの`delegation-packet`を生成してから、親自身がExecutor固有入口でdispatchする。自動dispatchやExecutor stateの複製はしない。
3. 観測・strict Worker Reportを回収し、`worker-report-import`で記録してから親がaccept/rejectを裁定する。`status --brief`でunresolved/unknown/uncollectedを確認し、timeoutや中断後は`resume-check`と同一handleで回収する。Task取消とRun cancel要求は別に記録し、外部側でcancel済みと推測しない。
4. `campaign-status`で全member terminalを確認し、audit-requiredなら証拠を揃えて親が`campaign-release`する。releaseは後続Runを自動起動しないため、親が改めてplacement／admission／dispatchする。
5. 受入済みTaskを`task-finalize-record`、全Campaign release後にControlを`control-finalize`でfinalizeし、検証・再発防止に有用な知識を正本へ還流してから`archive`する。

## Claude appendix（既存の運用詳細）

以下の憲法・配置・フェーズ・アンチパターンは、Claude の Workflow / Agent / codex-sidecar / aiterm を使う場合の具体的な入口である。共通原則の二重管理はせず、製品中立の判断は上の共通契約に従う。

Claudeでは親がWorkflow / Agentまたは外部のcodex-sidecar / aitermという固有入口でdispatchし、各入口のhandleを同じControlへ観測として投影する。Claude内部の共通dispatch APIやExecutor state複製を前提にしない。

## Claude 固有の運用

- 同期確認には `sync-sweep` を使う。端末横断リポの照合、dirty、stash、迷いブランチ、NO_REMOTE を明示してから着手する。
- Claude の委譲は [委譲契約の雛形](references/delegation-contract.md) と [Workflow 雛形](references/workflow-templates.md) を直接参照する。実物依存の characterization と既存 CI を安全網に使う。
- Claude の委譲物は diff とゲートを統括が再実行して採用する。コミット時は対象 pathspec を明示する。

## 知能の配置

| 層 | 担当 | 実行手段 | モデル |
|---|---|---|---|
| L0 統括 | 裁定・契約クリティカル（認可/tx/公開API互換/依存方向/本番操作）・履歴修復・コミット・最終責任 | 本人 | セッション主モデル |
| L1 監査・検証 | 発見→重複統合→**指摘ごとの反証**→網羅性Critic（盲点→第2ラウンド） | Workflow（`references/workflow-templates.md`） | 省略=主モデル継承（検証の精度優先）。数で押す finder は sonnet 可 |
| L2 設計 | 2〜4視点の並列設計（実行順序/配置/取捨 等）→**割れは統括が根拠で裁定**（多数決禁止） | Agent (Plan) | 主モデル継承 |
| L3 実装 | 仕様が固まった実装・テスト作成・逐語移設・整理 | **まず外部枠 codex-sidecar の `codex_work`（隔離 worktree・Claude レート非依存）**、次善で Agent/Workflow `model: sonnet`（機械的なら haiku） | 外部枠優先→sonnet |
| L4 外部CLI | 完全固定仕様の機械的一括・第三者視点レビュー | 非対話＝codex-sidecar の `codex_review`/`codex_work`/`codex_generate` 等／対話＝aiterm の `codex_agent`・`grok_agent`・`composer_agent` | レート非依存＝第一選択（02_models.md） |

**波の設計**: 並列は非交差ディレクトリで割る。同一ファイルを触る作業は直列化（wave 分け）。エージェントに branch 切替・commit をさせない。
**レート予算**: L0 統括（Claude）の窓は有限資源。物量は L4 外部枠（Codex/Grok＝Claude レート非依存）を第一選択にし、Claude 内 sonnet/haiku は外部の性能が足りない時の次善（同じ Anthropic 枠を食う）。委譲物は必ず統括が検証し、納得しなければ上位へエスカレーション（安さは品質の人質でない）。詳細 docs/02_models.md。
**継承の罠（最上位張り付き防止）**: Agent/Workflow の model 省略は親モデル継承＝親が最上位だと全子が最上位に張り付く。省略が許されるのは検証・反証・裁定系（L1 verify/Critic・L2・refuter）のみ。finder・dedup・整形・L3 物量は `model`（sonnet/haiku）と `effort: low` を明示する（配置の既定と effort ゲートは docs/02_models.md）。

## Claude のフェーズ実装

共通契約のフェーズに沿って、監査は L1 Workflow、設計は L2 Agent (Plan)、仕様固定の実装は L3/L4 の `codex-sidecar` または Claude Agent/Workflow を使う。各入口の model/effort は次節と `docs/02_models.md` に従う。

監査頻度は共通契約どおり、TODO完了候補ごとの軽量監査と、Phase完了時の重い独立監査に分ける。細かな編集ごとにWorkflowやrefuterを起動せず、TODO監査で再現した修正は統括が関連testで閉じる。複数視点・独立反証・Criticを伴う高コストな監査はPhase境界へ集約する。

## アンチパターン（実被弾済み）

- 反証なしで監査結果を実装へ（→ 危険な大改造が混入する）
- 裸の `git commit`（→ 並行エージェントの staged 変更を巻き込む。pathspec 明示）
- 安全網より先に本体を触る／ベースライン赤のまま着手
- 委譲仕様に再検証義務・罠リスト・合格条件を書かない（→ 品質はモデルでなく仕様で死ぬ）
- 1体に巨大タスク（→ 分解して波状に。1体=1責務=1レビュー単位）
- エージェントの「できました」を鵜呑み（→ ゲートは統括が回す）

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

- 委譲プロンプトの雛形: `references/delegation-contract.md`
- Workflow スクリプト雛形（敵対的監査・一括整理）: `references/workflow-templates.md`
- 役割→現行モデルの対応: `dotagents/docs/02_models.md`（バージョン固定禁止・外部枠優先・エスカレーション裁量）
- 出自と実測: NoveLore 全域リファクタ（Novel プロジェクトの記憶 `forklore-refactor-2026-07`）
