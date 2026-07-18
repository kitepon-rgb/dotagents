# 統括の共通契約

この契約は製品中立の統括原則である。各製品の入口は、実行手段だけを appendix として追加し、この本文を複製しない。
品質はモデル名や担当数ではなく、並列多視点、敵対的反証、安全網、委譲契約、親裁定という構造から作る。

## 着手と責務

- 作業前に同期状態（リモートとの差分、dirty、stash、作業中の並行変更）を確認する。同期できない・判断できない状態を黙って進めない。
- 触る前にベースラインの検証を green にする。リファクタには、これから触る契約だけを固定する characterization テストを先行させる。テストの期待が実挙動と異なる時は、プロダクションを直さず期待を実挙動に合わせる。
- 統括レーンへ入った後に役割を F / A / H に分ける。F は認可・トランザクション・公開契約・依存方向・本番操作・履歴修復など、統括が直接裁定する契約クリティカル作業。A は仕様と検証が固まった実装物量。H は人の明示承認が必要な操作である。

## 使う時・使わない時

**本正典を適用するのは統括レーンだけ**（オーナー裁定 2026-07-18・ADR 0061）: ①計画に中断が組み込まれている②受入が多段に連鎖する③複数repoの書込みを調整する④裁定の検証可能な証跡が必要、のいずれかが**着手時点の事実として確定**している戦役（campaign）。重装備（Packet/Report・Control記録）が要るのはwriter委譲・受入裁定・Phase gate・H操作の4関節だけで、それ以外は通常レーンと同じ軽さで進める。技法（fan-out・反証・Critic）はどのレーンでも使える。対象projectの`docs/`にある生きた計画/TODOが正本であることを最初に確認する。

それ以外はすべて通常レーンとし、Control Recordを使わない。短い成功条件、focused test、対象限定commitで閉じる。通常レーンでもWorkerへのコーディング委譲は可能で、Packetなしの明確な指示と親のdiff・test確認で受け入れる。途中で統括条件が揃ったら原子的作業を止めて昇格し、既存active Controlに属する作業を通常レーンへ降格しない。H操作の承認と高リスク操作の説明義務はレーンに関係なく適用する。

## Control Recordの最小lifecycle

1. docs正本を確認してからControlを`init`し、直後・最初のTask前にriskとbehavior laneを`phase-gate-record`で固定する。phase gate未設定のまま`task-record`へ進まない。既存Controlで設定漏れを発見した場合は、実在するretained evidenceだけで順序どおりphaseを記録し、事後の推測や証拠再構成で完了へ丸めない。その後、Taskを`task-record`、Worker RunまたはConsultationをそれぞれ`worker-run-record`または`consultation-record`で記録する。
2. Registry observationを記録し、`placement-dry-run`で候補を出す。親が候補を選び、`placement-reserve`でreservation proposalとして固定する。複数Runの完了を後続Taskの条件にする時は、親が`campaign-record`でmembers／gate／audit要否を宣言する。planned/admitted Workerの`delegation-packet`を生成してから、親自身がExecutor固有入口でdispatchする。packet保存漏れはactive Run専用のread-only `delegation-packet-recover`で回収し、同じRunを再dispatchしない。自動dispatchやExecutor stateの複製はしない。
3. 観測・strict Worker Reportを回収し、`worker-report-import`で記録してから親がaccept/rejectを裁定する。`status --brief`でunresolved/unknown/uncollectedを確認し、timeoutや中断後は`resume-check`と同一handleで回収する。Task取消とRun cancel要求は別に記録し、外部側でcancel済みと推測しない。
4. `campaign-status`で全member terminalを確認し、audit-requiredなら証拠を揃えて親が`campaign-release`する。releaseは後続Runを自動起動しないため、親が改めてplacement／admission／dispatchする。
5. 受入済みTaskを`docs/adr/<file>.md`の不変Decisionで`task-finalize-record`し、全Campaign release後に同じく不変ADRの親DecisionでControlを`control-finalize`する。追記可能なplan/TODOをaccept/reject/finalizationのDecision証拠へ使わない。過去digestの保持確認は同一repoのgit履歴にある同一path・regular blob・完全一致SHA-256だけを認め、別pathや近似一致へfallbackしない。検証・再発防止に有用な知識を正本へ還流してから`archive`する。

Delegation PacketとWorker Reportの必須項目・統括側の受入手順は[委譲契約](delegation-contract.md)を正本とする。

## 統括ゲート

1. 独立した反証で実在性と価値を確認するのは、契約クリティカル（F相当：認可・トランザクション・公開契約・依存方向・本番操作・履歴修復）な変更・監査指摘・設計判断だけ（オーナー裁定 2026-07-16）。それ以外は統括自身の確認で足りる。確信できない指摘は棄却する。
2. 委譲は[委譲契約](delegation-contract.md)のPacket 8点に従い、結果は統括が diff と検証で採用判断する（項目を本書へ再掲しない）。
3. 挙動不変レーンと挙動修正レーンを分ける。挙動修正は一件ごとに差分を明文化し、必要な承認を得る。
4. 作業を独立して revert できる単位に分割する。実装中はfocused testを回し、単位完了時に関連gateを1回通す（full regressionはPhase gateへ集約）。並行作業は書き込み範囲を交差させない。
5. 外部状態を変更する前には、目的・影響・rollback を説明し、H 承認が必要な操作は承認後だけ実行する。失敗を fallback で隠さない。

## 知能の配置原則（provider対称）

役割→モデルの解決はホスト側正典（`docs/02_models.md`）だけで行い、本契約とコードへモデル名を焼き込まない。
本契約が固定するのはproviderとの**関係**である:

- **Observerは親と同じprovider family**に置く。同じアプリのUXと近い思考様式による伴走が目的であり、
  ObserverはControlのWorker票にもConsultation票にも入らない（ADR 0043-5）。
- **相談役（Consultation）は親と異なるprovider familyを第一候補**にし、provider固有の盲点を補う。
  これは第一候補の原則であって強制拒否ではない——同familyのconnector（例: Codex親からのChatGPT相談）も
  引き続き使える。相談役はWorkerやObserverへ混ぜない。
- **一般Workerは適格候補（role・能力・独立性・F/A/H適合）内での適応配置**とする。残quotaに基づく
  rate-aware selectorが提供されるまで、quota架空値・暗黙fallbackで配置を成功扱いしない。

役割と配置関係の機械可読な対応は`lib/orchestrate/placement-policy.mjs`
（`dotagents.placement-policy.v1`）が固定し、fixtureがadapter catalogのconsultation laneおよび
Control schema v26のconnector enumとの整合を検証する。

## 実装と受入

- 並列実装は非交差の書込範囲でwaveを分け、同一ファイルを触る作業は直列化する。巨大な任務を一人へ渡さず、1責務を1受入単位に分解する。
- 統括はWorkerの完了報告を鵜呑みにせず、対象diff、受入条件、関連gate、未検証範囲を自ら確認してaccept/rejectする。受入済みの発見と検証結果は正本へ還流する。
- 安全網より先に本体を変更しない。反証なしの監査指摘を実装へ流さず、並行作業中に裸のcommitで他者の変更を巻き込まない。
- **active fixed Worker中の親commit**: 同じworktreeへの親commitは、予約HEADからのfast-forwardで、Taskの`read_scope`／`write_scope`と非交差なpathだけをpathspecでcommitし、Controlがcommit pathとindexを検証できる場合に限る。関連scope、履歴改変、staged成果、検証不能な変更はWorker完了までcommitしない。

## フェーズ

`ベースライン → 発見/監査 → 設計と裁定 → 安全網 → 実装 → 承認済みの挙動修正 → 統合と検証 → 知識還流`

設計と裁定の成果である計画には、非目標（やらないこと）、既知の罠、検証方法を必ず含める。

重い監査（Phase完了時・契約クリティカル範囲）は Find（複数視点）→ Dedup → 指摘ごとの反証 → Critic（盲点）→ 統括裁定の順に行う。件数遷移と棄却理由を残す。

## 監査の頻度

- 軽量監査はTODO完了候補時に1回：統括が対象diff、受け入れ条件、関連test、未検証範囲を確認して閉じる。標準経路外の手補正・証拠再構成があった場合だけ、握り潰さず正本TODOへ記録する。
- 重い監査構造（複数視点・独立反証・Critic）はPhase完了時に1回、契約クリティカルな範囲に限定する（オーナー裁定 2026-07-16）。検証者は原則として親と異なるproviderを使う（Claude親→Codex、Codex親→Claude。対応と入口は`docs/02_models.md`）。P0/P1相当の再現問題を除き、同じTODOへ監査を反復しない。
- 監査を編集回数・不安・監査自身の指摘追加を理由に増殖させない。

## Phase maintenance

- 即時修理するのは、データ損失、security・認可・秘密漏洩、公開契約・履歴破壊、回復不能、現在のcritical pathまたはPhase受入を塞ぐP0/P1だけ。非クリティカルなコア欠陥は最小再現・影響・所有repoを既存planのmaintenance queueへ一度記録して本筋を続け、欠陥ごとの新規plan、Control、ADR、独立監査、receiptを作らない。
- Phaseの通常TODO後、full regressionとPhase監査の前にmaintenance waveを一回だけ行い、重複統合、再現確認、repo別修理、focused/related gate、repo別独立commitの順で閉じる。同じrepoの関連小修正は一受入単位へまとめてよい。H、credential/login、第三者修正、本番操作待ちは理由と必要条件を明記してcarry overし、未修理を成功扱いしない。

## 還流

知識還流Phaseの置き場と作法は共通憲法「調査と知識の置き場」に従う。
