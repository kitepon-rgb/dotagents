# Archive finalization Decision履歴保持の修復記録

日付: 2026-07-15

Status: Accepted / Immutable evidence

## Reproduction

Observer Control `observer-independent-foundation-20260714`をrevision 71でfinalizeした後、正規`archive`が
`EVIDENCE_DIGEST_MISMATCH`を返した。過去のTask finalizationが可変な`docs/plan_observer.md`を
`type=decision`として記録しており、旧digestは同一pathのgit履歴へ残っている一方、archiveの
`verifyFinalizationRetention`は現在ファイルしか再hashしなかった。

`resume-check`には同じ旧Decisionを最大256 commit、合計64 MiB、同一pathのregular blob、完全一致
SHA-256だけで保持確認する実装が既にあるため、正典とarchive実装が分断されていた。

## Decision

- Task／Control finalization receiptの`type=decision`だけに既存のbounded git履歴探索を再利用する。
- 現在ファイルがexact digestなら従来どおり受理する。
- 現在ファイルがmissingまたはdigest不一致でも、同一repo・同一path・regular blob・exact digestが
  bounded履歴にある時だけ受理する。
- `type=file`、別path、近似一致、unsafeな現path、bare repoは履歴保持へ広げない。
- manifest schema、receipt、finalization digestは変更しない。

## Evidence

- 変更: `lib/orchestrate/control-record.mjs`
- 契約: `shared/orchestrate/control-record.md`
- 回帰: `tests/orchestrate/control-record.test.mjs`
- 正本TODO: `docs/plan_observer-factory-integration.md`
- focused gate:
  `node --test --test-name-pattern='finalization.*history|history.*finalization' tests/orchestrate/control-record.test.mjs`
  — 1/1 PASS
- whitespace gate: 対象差分の`git diff --check` PASS

回帰fixtureは旧Task Decisionをcommit後に同一pathで置換し、同時に`type=file`証拠も旧版を履歴へ残して
置換する。最初のarchiveはfile digest不一致で拒否され、fileのcurrent bytesだけを復元すると、旧Decisionを
履歴保持した同じControlがarchiveできる。

## Friction check

Observer manifestの直接編集、digest再構成、別path探索、manual normalization、alternate recoveryは
使用していない。失敗したarchiveは状態を変更しておらず、修復後に同じrevisionと正規入口で再試行する。
