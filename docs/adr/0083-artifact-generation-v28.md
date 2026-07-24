# ADR 0083: docs artifactの原子的世代交代をv28単一receiptで表現する

- Status: Accepted
- Date: 2026-07-20
- Lattice task: `factory-master/fm-0625`

## Context

Control Recordの`artifact-record`と`artifact-status-record`は各々正しいが、同一pathのcurrent artifactを
先に上書きすると旧digest検査がfail closedし、旧byte列を復元するまでsupersedeできない。二つの既存mutationを
直列に使うとcurrentが二重または一時不在になり、1回のmanifest renameへ2 receiptを詰めても
「1 mutation = 1 revision = 1 receipt」と存在しない中間revisionを作らない契約を破る。

## Decision

1. manifest schema v28と`artifact-generation-record`／`artifactGenerationRecord`を追加する。
2. v28の新規artifact refは、本文SHA-256全文をbasenameへ含む`docs/`配下の版付きpathだけを受理する。
3. generationは旧currentと新currentの通常file・digestをglobal lock内で再検証し、旧を`superseded`、新を
   `current`として同じ1 revisionへ記録する。
4. receiptのsubjectは旧artifact、状態は`current -> superseded`とし、subject digestは
   `dotagents.artifact-generation.v1`の旧・新immutable descriptorを結合して算出する。
5. manifestは1回のatomic renameでcommitし、中間状態を公開しない。旧byte列の履歴・別path探索・近似一致へ
   fallbackしない。上書き後はexact byte列を同じ版付きpathへ復元してから再試行する。
6. v27→v28 migrationは既存descriptorを変更しない。非版付きlegacy artifactは読めるがgenerationの旧世代には
   使えない。generation receiptがあるv28はv27へrollbackできない。

## Rejected alternatives

- 既存2 mutationの直列実行: currentの二重化または欠落が外部から観測される。
- 1回のrenameで2 revision／2 receiptを追加: mutation/revision/receiptの一対一契約を破り、未公開の中間revisionを作る。
- git履歴や別pathから旧byte列を暗黙回収: 証拠の取り違えを隠し、fail-closed境界を弱める。

## Evidence

- `tests/orchestrate/control-record.test.mjs`のartifact generation API／CLI／recovery／rollback fixture
- `shared/orchestrate/control-record.md`のschema migration・Docs artifact projection・CLI契約
