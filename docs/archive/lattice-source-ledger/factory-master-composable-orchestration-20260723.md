# factory-master Composable Orchestration authoring ledger

> 同じsuccessor revisionでLatticeへ移管する凍結authoring台帳。以下のcheckbox状態は進捗正本ではなく、Task・依存・状態・証拠の唯一正本はLattice storeである。

- [ ] レーンと実行形の直交、各製品の単体成立、正本境界、single dispatch ownerを本計画と不変Decisionへ固定する。
- [ ] dotagentsのLattice consumer driftを修復し、typed discovery、todo status v4/frontier、run取得失敗のfail-visible化、resume/close/abandon契約更新、Control API/CLI gate一致を閉じる。
- [ ] Lattice 0.12.7のINVALID_RUN_STOREと製品契約version driftを製品repoで診断し、不具合ならfocused test、version bump、publish、global install、公開後smokeまで単体release waveで閉じる。
- [ ] 親宣言の4条件だけをclosedに正規化するpure admission contractを実装し、予測classifierや通常レーンの永続receiptを作らずControl初期化へ束縛する。
- [ ] 現行二型だけのhost共通固定Recipe契約を作り、Claude/Codex正規入口で入力・出力・gate・失敗条件を一致させる。
- [ ] Control Taskへclosed external-source bindingを追加し、Lattice stateを複製せずschema migrationとdirect path互換を保証する。
- [ ] dotagentsにLattice public CLIのread-only projectionを実装し、project state、todo frontier、run error、version mismatchをexact schemaで区別する。
- [ ] LatticeでTODO identity・compile_binding・runtime request/plan・executor receiptを結ぶhost中立public projection/transactionをcharacterizeし、不足時だけ製品契約・実装・releaseを追加する。
- [ ] Lattice子receiptをControlの子別strict Reportへbounded projectionし、scope・digest・partial failure・dispatch ownerを検証可能にする。
- [ ] ready選択からControl placement、Lattice run start、子受入、Lattice工程反映までをbridge DBなしのidempotent sagaとrecoveryとして実装する。
- [ ] 通常レーンの固定Recipe、Control direct、Lattice standalone、Lattice不能時の明示直列化を同じ適用方針で接続し、どの製品も相手を必須にしない。
- [ ] 単体・非導入・停止・unknown version・stale frontier/base・invalid run store・部分失敗・crash/resume/close/abandonのfixture matrixを通す。
- [ ] 同一repo複数writerの実dogfoodでcompile、Lattice単一dispatch、子別Control受入、Lattice完了反映、resume/closeを端から端まで受け入れる。
- [ ] 契約クリティカル範囲の一回監査、各repo独立CI/release/global install/smoke、rollback、knowledge return、計画archiveを完了する。
