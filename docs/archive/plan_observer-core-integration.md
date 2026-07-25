# Observerコア製品正式編入

- Status: Complete
- Date: 2026-07-25
- Archived: 2026-07-25
- Lattice plan: `observer-core-integration`
- Decisions: [ADR 0123](adr/0123-observer-core-integration-reinstatement.md)、
  [ADR 0124](adr/0124-wire-v6-observer-enrollment.md)、
  [ADR 0125](adr/0125-observer-core-integration-final-acceptance.md)
- Control: `observer-core-integration-20260725`

## 目的

自作コア製品として完成済みのObserverを、製品release、factory wire v6、ServerManager/BugHub、
dotagents adapter、全host運用、rollbackまで一続きの製品として届ける。旧計画の誤終了は履歴を消さずに
訂正し、Observerを「予約」から「現役コア」へ正式に移す。

## 完了状態

- Observer `6a2917c55032`を`@quolu/observer@0.1.0`、tag / GitHub release `v0.1.0`
  として公開し、global installとnative diagnosticsを確認した。
- factory wire v6・固定14製品へ編入し、4 hostでv6→v5→v6 rollbackを実測した。
- 工場の現役管理対象を11製品、自作コアを10製品、第三者管理をMarkItDown 1製品として
  正典化した。
- Observer、dotagents、ServerManager、AIShellで発見した工場欠陥を修理・公開・配備した。
- 最終受入と回帰結果は
  [最終監査](evidence/2026-07-25-observer-core-integration-final-audit.md)を正とする。

## 設計境界

### 固定するもの

- 旧`observer-factory-integration` taskは再利用せず、新Lattice planを唯一の作業状態正本にする。
- wireはv3へ遡らず、現役v5からv6・固定14製品へ進める。
- Observer v1はmacOS required。他profileは`unsupported`を構造的に報告する。
- Observer自身のrelease identityと診断契約を確定してからfactory側をcutoverする。
- ServerManager/BugHubを先にv6対応し、feature flag下でclientより先に受理可能にする。
- v5 endpoint、report履歴、host別outboxをrollback条件が満たされるまで保持する。

### 非目標

- Observerの新機能開発や製品契約の拡張
- Linux・WSL・Windows native対応の追加
- MarkItDownを自作コア製品として扱うこと
- 過去のcommit、archive文書、BugHub履歴の削除・書換え
- ServerManagerの`.claude/settings.local.json`変更
- 旧wire v3の実装

## 作業と承認の所有

- **F**: 製品区分、wire v6、version/release契約、schema、migration、privacy、rollback、
  旧誤裁定の訂正。
- **A**: 固定済み契約に従う実装、fixture、focused test、pack/install smoke。
- **H**: GitHub remote作成、push/tag、registry publish、global install、live endpoint切替、
  host canary/cutover、rollback drillの外部変更。

H操作はControl taskへ承認snapshotを記録し、実行直前に目的・影響・戻し方を提示する。

## 受入条件

1. Observerに正規version、repository metadata、CI、既定branch祖先release gateがあり、
   test・check・pack・隔離install・diagnosticsがgreen。
2. source remote、既定branch、tag、公開更新経路が成立し、対象Macへ正規入口から導入できる。
3. wire v6のschema・privacy・固定14製品・v5互換・migration・rollbackが正典化される。
4. ServerManager/BugHubがflag下でv6を受理し、Observer期待値とissue identityを正しく扱う。
5. dotagentsがObserverのinstall/update/diagnostics/host projectionを所有し、macOSではrequired、
   他profileでは`unsupported`を報告する。
6. server-first dual-run、Mac canary、全host report、outbox/dead-letter、rollbackを実測し、
   既存13製品とv5運用を壊さない。
7. README、製品契約台帳、host matrix、wire正典、BugHub期待matrixが11コア製品の現実と一致する。
8. Phase監査とknowledge returnを閉じ、未完了項目を完了扱いせず計画をarchiveできる。

## 既知の罠

- 旧終了理由だった`0.0.0`やremote不在は、製品化taskの入力であり編入中止理由ではない。
- Latticeの旧receiptはpathとdigestだけでpatch本体を失う版があった。委譲成果を使う場合は、
  accepted receiptのartifactに実体が保持されていることまで確認する。
- wire v5の固定13製品や各profile期待値を機械生成せず複製すると、14製品化後に面ごとのdriftが起きる。
- Windows hostへのshellがWSLへ入る既知事故がある。Windows nativeとWSLのhost identityを混同しない。
- Observerの旧planには最終監査greenと未消化checkboxが同居する。version/release readinessを
  実物で再照合し、checkboxだけで完了判定しない。

## 工程正本

task、依存、ready frontier、完了証拠はLattice plan `observer-core-integration`だけを正本とする。
この文書へtask checkboxを複製しない。ControlはPhase gate、F/H裁定、受入証拠、外部実行の
検証可能性を所有する。
