# Lattice child-plan calibration evidence

- source commit: `53572f7c1f2872462c5facfeaade95c331875cbc`
- pre-write inventory digest:
  `28422ec39eb9bc9a9bbca959b841e2aacac2a58bbdd051e461de9f7f9c1e8cf3`
- inventory: 656 total / 505 checked / 151 unchecked
- Lattice CLI: global `@quolu/lattice@0.6.1`
- observed: 2026-07-19 JST

## 校正済みartifact

| plan key | tasks | done | pending | extraction digest |
|---|---:|---:|---:|---|
| `bughub-factory-integration` | 203 | 175 | 28 | `88d6ac3c9154bff48dfefec7ff6c0e4439e10cd22e0c576a162f5537fb1cd522` |
| `codex-full-support` | 79 | 39 | 40 | `892719cecb558ae46aebf87ec7beb438e07a61701657d899686dcb46501e5b13` |
| `gpt56-rewiring` | 38 | 32 | 6 | `1b0d871cfa3c7c95c5d05a931a671dde98bc8e5ccc3f34e8791fcbef7e398314` |
| `lattice-factory-integration` | 82 | 61 | 21 | `64fc9dcf5177473f624535e900f9a5ee1e4daf70935115b40ee6b47272c3515b` |
| `observer-factory-integration` | 118 | 101 | 17 | `c2427c19623cfa1f0f823218efa1f90b830afb47ff6ca4b552fea76cf5cd2bc8` |
| `memory-promotion-queue` | 17 | 12 | 5 | `031aeff626d354f282919176cf4b4500fb9c56f1b24c0e612c7522b3378138ff` |

合計は453 tasks / 420 done / 33 pending。全taskのdispositionは確定済みで、
`unknown_requires_evidence`はゼロである。Markdown親子は112件、laneは正規headingから固定した。
子計画のhard dependencyはゼロと校正した。これは依存情報の欠落ではなく、工場の実行順を
`factory-master`へ一元化し、詳細受入台帳の曖昧な順序文をhard edgeへ昇格させない裁定である。

## Fail-closed確認

校正前artifactはglobal `0.6.1`の`lattice todo migrate`で6件すべて
`MIGRATION_UNRESOLVED`となり、store tree digest
`06ceec06e05e3623bf9b1144e305619cb6e71c2124caddf1464bec00525091b8`は不変だった。
校正済みartifactはLatticeのexact schema validatorとcompilerを通過した。store書込み、`verify`、
task数差分はartifact commit後のcutover receiptへ追記する。
