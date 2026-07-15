# 統括の共通契約

この契約は製品中立の統括原則である。各製品の入口は、実行手段だけを appendix として追加し、この本文を複製しない。
品質はモデル名や担当数ではなく、並列多視点、敵対的反証、安全網、委譲契約、親裁定という構造から作る。

## 着手と責務

- 作業前に同期状態（リモートとの差分、dirty、stash、作業中の並行変更）を確認する。同期できない・判断できない状態を黙って進めない。
- 触る前にベースラインの検証を green にする。リファクタには、これから触る契約だけを固定する characterization テストを先行させる。テストの期待が実挙動と異なる時は、プロダクションを直さず期待を実挙動に合わせる。
- 役割を F / A / H に分ける。F は認可・トランザクション・公開契約・依存方向・本番操作・履歴修復など、統括が直接裁定する契約クリティカル作業。A は仕様と検証が固まった実装物量。H は人の明示承認が必要な操作である。

## 使う時・使わない時

複数Phaseまたは複数担当をまたぎ、resume、複数Executorの配置、競合・予算・監査・知識還流を一つの作業として管理する時に使う。対象projectの`docs/`にある生きた計画/TODOが正本であることを最初に確認する。

単一ファイル数十行程度の非クリティカル修正、単純な質問・読取・局所診断には、Control Recordを強制しない。ただし、既存active Controlに属する作業はこの除外にしない。

## Control Recordの最小lifecycle

1. docs正本を確認してからControlを`init`し、直後・最初のTask前にriskとbehavior laneを`phase-gate-record`で固定する。phase gate未設定のまま`task-record`へ進まない。既存Controlで設定漏れを発見した場合は、実在するretained evidenceだけで順序どおりphaseを記録し、事後の推測や証拠再構成で完了へ丸めない。その後、Taskを`task-record`、Worker RunまたはConsultationをそれぞれ`worker-run-record`または`consultation-record`で記録する。
2. Registry observationを記録し、`placement-dry-run`で候補を出す。親が候補を選び、`placement-reserve`でreservation proposalとして固定する。複数Runの完了を後続Taskの条件にする時は、親が`campaign-record`でmembers／gate／audit要否を宣言する。planned/admitted Workerの`delegation-packet`を生成してから、親自身がExecutor固有入口でdispatchする。packet保存漏れはactive Run専用のread-only `delegation-packet-recover`で回収し、同じRunを再dispatchしない。自動dispatchやExecutor stateの複製はしない。
3. 観測・strict Worker Reportを回収し、`worker-report-import`で記録してから親がaccept/rejectを裁定する。`status --brief`でunresolved/unknown/uncollectedを確認し、timeoutや中断後は`resume-check`と同一handleで回収する。Task取消とRun cancel要求は別に記録し、外部側でcancel済みと推測しない。
4. `campaign-status`で全member terminalを確認し、audit-requiredなら証拠を揃えて親が`campaign-release`する。releaseは後続Runを自動起動しないため、親が改めてplacement／admission／dispatchする。
5. 受入済みTaskを`task-finalize-record`、全Campaign release後にControlを`control-finalize`でfinalizeし、検証・再発防止に有用な知識を正本へ還流してから`archive`する。

Delegation PacketとWorker Reportの必須項目・統括側の受入手順は[委譲契約](delegation-contract.md)を正本とする。

## 統括ゲート

1. 大きな変更、監査指摘、重要な設計判断は、独立した反証で実在性と価値を確認する。確信できない指摘は棄却する。
2. 委譲には、対象範囲、変更の性質、仕様、罠、characterization 規約、検証、前提再検証、報告形式を明示する。委譲結果は統括が diff と検証で採用判断する。
3. 挙動不変レーンと挙動修正レーンを分ける。挙動修正は一件ごとに差分を明文化し、必要な承認を得る。
4. 作業を独立して revert できる単位に分割し、各単位で全ゲートを通す。並行作業は書き込み範囲を交差させない。
5. 外部状態を変更する前には、目的・影響・rollback を説明し、H 承認が必要な操作は承認後だけ実行する。失敗を fallback で隠さない。

## 実装と受入

- 並列実装は非交差の書込範囲でwaveを分け、同一ファイルを触る作業は直列化する。巨大な任務を一人へ渡さず、1責務を1受入単位に分解する。
- 統括はWorkerの完了報告を鵜呑みにせず、対象diff、受入条件、関連gate、未検証範囲を自ら確認してaccept/rejectする。受入済みの発見と検証結果は正本へ還流する。
- 安全網より先に本体を変更しない。反証なしの監査指摘を実装へ流さず、並行作業中に裸のcommitで他者の変更を巻き込まない。

## フェーズ

`ベースライン → 発見/監査 → 設計と裁定 → 安全網 → 実装 → 承認済みの挙動修正 → 統合と検証 → 知識還流`

設計と裁定の成果である計画には、非目標（やらないこと）、既知の罠、検証方法を必ず含める。

監査は Find（複数視点）→ Dedup → 指摘ごとの反証 → Critic（盲点）→ 統括裁定の順に行う。件数遷移と棄却理由を残す。

## 監査の頻度

- 軽量監査は、細かな編集や個別patchごとではなく、計画文書のチェックボックス1件（TODO）を完了候補にした時に1回行う。統括が対象diff、受け入れ条件、関連test、未検証範囲を確認してからTODOを完了にする。
- TODO完了候補時に一度だけ、標準経路外の手補正・証拠再構成・代替回収の有無も確認する。有った場合は最終結果が成功でも握り潰さず、本筋へ戻る前に所有repoの`docs/`正本TODOを登録するか既存TODOを具体的に参照する。この確認専用のreceipt・schema・個別testは増やさない。
- TODO監査で再現できた問題は修正し、統括が該当testと再現手順で閉じる。同じTODOへ新しい独立監査を反復してシーソーさせず、残る横断的な懸念はPhase監査へ送る。ただしP0/P1相当の契約破壊・安全上の問題が再現した場合は、その問題を閉じるまで完了扱いにしない。
- 重い独立監査はPhaseの全TODOと通常gateが完了した時に1回行う。複数視点、独立反証、Critic、親裁定など高コストな監査構造はここへ集約する。
- 全体完成時は、計画の全受け入れ条件と成果物を対象に最終監査を行う。TODO監査やPhase監査を、単なる編集回数・不安・監査自身の指摘追加を理由に増殖させない。

## 還流

調査、実測、再発防止に有用な知識は、所有プロジェクトの文書・罠データベース・再利用可能な調査記録へ還流する。外部ツールの管理領域へプロジェクト状態を置かない。
