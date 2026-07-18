# ADR 0067: Lattice Stage 1で3作業の実並行dogfoodを受け入れる

Date: 2026-07-19

## Decision

Lattice 0.5.0の正規Stage 1 driverを、delivery policyの使い捨てrepoへ実適用した結果を受け入れる。
Codex executorは未実証のため使わず、Latticeで現在execution-provenなClaude implementerを3件、
別々のdetached worktreeへ同時dispatchした。

人が読める3作業は次のとおり。

- delivery policy resolverの小粒な挙動不変整理
- delivery policy black-box oracleの小粒な挙動不変整理
- delivery policy入力検証のcharacterization test追加

3件とも割当1ファイルだけを変更し、focused testがgreen、checkpoint findingが空、receiptがacceptedに
なった。正規Lattice repoとdotagents repoへpatchは着地していない。

## Evidence

- Node: `/opt/homebrew/opt/node@24/bin/node` 24.18.0
- compile schema: `lattice.plan_compile_result.v1`
- verify: `outcome=verified`, `minimum_feasible_waves=1`
- request digest: `e6b9dc799928d61a56f33a050c8396b5482cd2b7924066cf186b53dd935e0270`
- plan digest: `140dfb81cebd915b7911e88351a8c97b53a9c9272dd265860d85b64d6bd7fc2f`
- graph digest: `e820b88b89d25952ee787745f08420f6eaca075b6737049d73e472f99febb2ab`
- receipts: resolver、oracle、入力検証testの3件すべてaccepted
- close: `closed=true`, `residual=[]`
- artifact verification: `valid=true`, `failed_conditions=[]`
- green checks: event chain、双方向receipt replay、provider separation、accepted receiptへのpatch束縛、isolation contract完全性
- Lattice正規repo: HEAD `9d57608491178a2cd676c469be6ffd39b14d0200`、tree clean
- dotagents正規repo: HEAD `725ffec9c11d6573ab9b0021d370076bab479a84`、tree clean

dogfood artifactは`/tmp/lattice-dogfood.x8R8se/artifact/v1`へ保持した。3つの実行worktreeは
Lattice close後に除去され、残った空の親directoryも対象をexact指定して除去した。

## Boundary

これはLatticeのClaude implementer経路の実証であり、Codex native／Codex SidecarをLattice executorとして
認定する証拠ではない。Codex adapterは別のdisposable fixtureで実証するまで未認定を維持する。
