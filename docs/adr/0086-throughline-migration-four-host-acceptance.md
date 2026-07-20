# ADR 0086: agents-update Throughline migrationの4 host受入

## 状態

Accepted with factory-wide carry-over — 2026-07-20

## 親裁定

`agents-update`がThroughline package更新直後、factory reporterより前に `throughline migrate --json` を呼び、
versioned success JSONだけを受理する実装を受け入れる。CLI非0・不正JSONは更新失敗として名指しし、reporterは
省略しない。SQLやschema migrationをdotagentsへ複製しない。

## 実装・回帰証拠

- 設計: [ADR 0085](0085-agents-update-throughline-migration-gate.md)
- 実装commit: `7604fe4`
- focused test: `bash -n` 2件と `tests/update/cron-env.sh` green
- fixtureは正常、CLI非0、不正な終了0 JSON、失敗後reporter継続、migration→reporter順序を固定
- GitHub CI: run `29724519368` green
- Throughline公開版: `0.8.6`、shasum `b4a9ccda9b69715d51c37408d696a210103ee47a`

## 4 host受入

Mac、main-server、FOX WSL2、FOX Windows nativeで実 `agents-update` を初回実行し、4台すべてでpackage更新自体は
success、`throughline@0.8.6`、migration `already_current`、schema 9 / 9を確認した。各hostの
Throughline製品checkは最終的にdatabase schema / Codex hooksともpassした。FOX Windowsの旧hook commandだけは
製品正規入口 `throughline install` で更新後に再投影した。

factory reporter全体は次の既存別checkが残るためgreenではない。

- Mac / main-server / FOX WSL2 / FOX Windows: Caveat native diagnostics、Codex native routing、
  toolchain ledger `post_gate_failed`
- main-server: ServerManager factory ingest stale

Lattice native diagnosticsは全hostでpassした。Latticeの不具合は検出しておらず、Lattice製品repo／実装は変更していない。
このため実装Controlは受理するが、工程表 `fm-0645` はfactory-wide gateがgreenになるまでblockとして保持し、
他製品の修理を本Taskの完了条件へ無断追加しない。

## 0.8.5 package混入と修復

release dry-run後、別セッションがThroughline worktreeへ未コミット文書を追加し、0.8.5 tarballへ1件混入した。
runtimeは汚染されていなかったが成功扱いせず、0.8.5をdeprecateした。受理済みcommitから隔離clean worktreeを作り、
禁止文書なし・migrate実装ありの208 filesを確認して0.8.6を再公開し、`latest`、tag、GitHub Releaseを0.8.6へ固定した。
別セッションのWIPは変更・収容・破棄していない。

## H操作とrollback

目的は4hostの実更新経路とfactory投影を検証すること。影響はcurated package更新、factory report送信、
Throughline global install、FOX WindowsのThroughline管理hook/skillである。rollbackはThroughline旧版の再install、
`throughline uninstall`または設定backup復元、必要時のDB backup復元。オーナーの本戦役H承認に基づき実行した。
