# ADR 0022: Phase R1 local closure

日付: 2026-07-16

## Status

Accepted。wire v2の製品所有repo修正、dotagents local adapter、H不要のPi5 source／fixtureを閉じ、
Phase R1を完了する。実host apply、credential／login、実配送、本番BugHub、意図的障害、publish／pushは
受け入れず、R2／R3へ分離する。

## Accepted receipts

- [ADR 0012](0012-toolchain-update-version-acceptance.md): 基盤toolchain 3製品のexact update契約。
- [ADR 0013](0013-throughline-diagnostics-product-receipt.md): Throughline diagnostics v0.6.3。
- [ADR 0014](0014-windows-factory-acl-local-receipt.md): Windows factory ACL local契約。
- [ADR 0015](0015-windows-npm-shim-local-receipt.md): Windows npm shim resolver。
- [ADR 0016](0016-spotter-windows-codex-product-receipt.md): Spotter v1.4.25 Windows経路。
- [ADR 0017](0017-codex-sidecar-windows-mcp-product-receipt.md): Codex Sidecar v0.3.7 Windows診断。
- [ADR 0018](0018-sidecar-auditor-preset-local-receipt.md)と
  [ADR 0020](0020-sidecar-auditor-adapter-receipt.md): `auditor` preset／caller／factory adapter exact契約。
- [ADR 0021](0021-servermanager-pi5-bughub-bridge-receipt.md): ServerManager Pi5 bridge／ticker source fixture。

ADR 0019の独立反証で生存したP1 2件はADR 0020／0021で閉じた。ADR 0018のadapter受入に関する
過大主張はADR 0019のsupersedeを維持し、ADR 0020を正しいadapter receiptとする。

## Phase gate

- full `make ci`: exit 0。
- Markdown: 0 error。
- Claude hooks: 47 PASS / 0 FAIL、Codex hooks: 32 PASS / 0 FAIL。
- factory reporter: 61 PASS / 0 FAIL / 0 SKIP。
- factory scan: 67 PASS / 0 FAIL / 0 SKIP。
- orchestrate: 114 PASS / 0 FAIL / 0 SKIP。
- constitution parity、skills、official／legacy clean HOME install、Observer hook config、update、Oracle wrapper、
  factory core smoke: PASS。
- full gateはP1修正後のworkspace digestで一度だけ実行した。同じPhaseへ追加監査／full回帰を反復しない。

## Independent refutation

Codex native `refuter`による一回のR1 closure反証はP0なし、P1 2件だった。Sidecar adapterは
`--preset auditor`、exact dry-run、explicit model policyのnegative fixtureで修正し、Pi5 bridgeは
ServerManagerのimmutable commit/pathとfocused 12＋4件で受け入れた。親は両correctionの実diff、
受入条件、focused／full gateを確認したため、同じTODOへの二度目の独立監査は行わない。

## Queue transition

- R1をDONEにする。
- 4 hostのSidecar／Throughline／ACL／npm shim実配布receiptはR2の一回のhost campaignへ統合する。
- BugHub停止中outbox、Pi5 transient／open→resolve、rollbackはR3のH承認済みcanaryへ統合する。
- ready queueの次はObserver Phase O2。H-WAITをready作業へ混ぜない。
