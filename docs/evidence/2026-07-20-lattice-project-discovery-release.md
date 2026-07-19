# Lattice project discovery／初期authoring修正リリース

- Date: 2026-07-20
- Product: Lattice
- Release: `@quolu/lattice@0.6.7`
- Implementation commit: `81bf35ba51f6fc6209761285a7966cde5cf534bb`
- Release evidence commit: `7579fc3`

## 原因と修正

CLIが導入済みでもstoreのないrepoを機械判定する公開面がなく、`.lattice/`の有無を接続判定へ
誤用できた。初回planの正規authoring入口も存在しないため、agentがLatticeを未導入と誤認し、
Markdownへ戻る設計欠陥だった。

- `lattice status --json`を追加。`uninitialized | ready | active_run | invalid`、CLI/version、
  project、canonical store、active plan/run、`can_create_plan`、`next_action`をtyped返却する。
- 未初期化はexit 0、invalidはexit 1。`.lattice/`の存在を接続markerにしない。
- `lattice plan create --input <ref>`を追加し、初回full desired-state planをdirectory rename
  transactionで登録する。
- `lattice plan create --schema --json`とNPM package収録schemaを追加した。
- SHA-256 Git、末尾空白path、親symlink、input TOCTOU/size、rename後exact再検証、rollbackを
  focused testとfault injectionで固定した。

## 検証と公開

- Lattice `npm run ci`: green
- sensor suite: 147 files passed、3 skipped、2488 tests passed、37 skipped
- 独立refuter: 通常運用で再現する未解消契約欠陥なし、公開可
- registry shasum: `b40e224d48f0e382bc74fae2f16e2b86938ccd42`
- registry integrity:
  `sha512-F9H1S7TVcqtz+CPUG1i2ZzPWjculM8gZ7QyzQYEickuEPqGNC8id0DQiXizVtIempYM0wwWJtB/HEOt//ofLog==`
- global executable: `/opt/homebrew/bin/lattice`
- global version: `0.6.7`
- Lattice repo: `uninitialized`、`can_create_plan=true`、schema取得green
- dotagents: `active_run`、8 active plans、`todo verify` green、`snapshot_stale=false`

## dotagents規約

`shared/constitution.md`の人間解釈だった「Lattice接続済み」を廃止し、工程を読む／作る前に
`lattice status --json`を実行する規則へ変更した。`ready`／`active_run`はLatticeだけを正本、
`invalid`は停止してMarkdown fallback禁止、`uninitialized`はscope／裁定に従い正規create入口を
使う。生成済みClaude/Codexグローバル憲法も同じ正本から再生成した。

global rollbackは`npm install -g @quolu/lattice@0.6.6`。公開物の修正は上書きせず新patchで行う。
