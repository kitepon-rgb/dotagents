# ADR 0070: Lattice wire v4 cross-provider監査受入

- 状態: Accepted
- 日付: 2026-07-19
- Control: `lattice-wire-v4-cutover-20260719`
- Task: `lattice-cutover-cross-refuter`
- Worker result digest: `cfb4a6df75008bba8f77c4405689a90830947b8a38ef13d962bb728407fd1e5f`

## 文脈

Lattice successor revisionとdotagents status v3 hookは、schema、digest、履歴不変、crash recovery、
旧wire互換をまたぐ契約criticalなcutoverである。Claude managed sessionはread-only commandのpermission
UIを正規に承認できず中断したため、AITerm上のGrok 4.5を独立refuterとして使用した。

## 決定

[cross-provider反証監査](../evidence/2026-07-19-lattice-wire-v4-cross-provider-refutation.md)を
親の受入証拠として採用する。

- worker terminal receiptは`outcome=done`である。
- worker結論は`pass`、確定した実装欠陥は0件である。
- 親はLattice full `npm run ci`、dotagents full `make ci`、対象diffを独立に再確認した。
- removed migrationのhistory/evidence不変は追加focused testとcommit `24d7166`で直接証明した。
- 追加test提案は非blockerであり、現release契約の欠陥としては採用しない。

## 帰結

wire v4の実装・hook統合はrelease準備へ進めてよい。npm publish、global install、実host設定、pushは
別のH境界であり、本決定だけでは許可しない。
