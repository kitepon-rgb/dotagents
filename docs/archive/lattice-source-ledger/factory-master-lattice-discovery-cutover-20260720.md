# Factory master — Lattice discovery source cutover

2026-07-20にオーナー会話から直接起票し、同日のsuccessor revisionでLatticeへ移管した。

- [ ] `lattice status --json`を全repo共通のtyped discovery入口として実装し、CLI/version、project、`uninitialized`／`ready`／`active_run`／`invalid`、正規store、active plan/run、`can_create_plan`、次commandを返す。未初期化は成功応答で`plan create`を案内し、agent規範をdiscovery結果でLattice/Markdownを選ぶ契約へ更新する。AIShellの新規plan authoringは本taskの公開・global install・smoke完了後に開始する。
