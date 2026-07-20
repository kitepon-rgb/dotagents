# ADR 0095: cf-0024 四ホスト・コア8製品E2E受入

## 状態

受入済み

## Decision

ADR 0094で定めた境界に従い、Mac、main-server、FOX WSL2、FOX Windows nativeの4 hostで
工場コア8製品を更新し、presence、version、親別connector、Spotter限定発火、Throughline context、
代表read-only E2Eを直接観測または同日付の保持済みreceiptへ結び付けたため、Lattice task `cf-0024` を完了とする。

| product | Mac | main-server | FOX WSL2 | FOX Windows native | 代表受入 |
|---|---|---|---|---|---|
| Caveat | 0.17.1 ready | 0.17.1 ready | 0.17.1 ready | 0.17.1、Claude面ready／Codex面はhost matrixどおりunsupported | native diagnostics、private sync |
| Throughline | 0.8.7 | 0.8.7 | 0.8.7 | 0.8.7 | DB v9、Codex hooks、restore、Spotter context |
| Spotter | 1.4.26 | 1.4.26 | 1.4.26 | 1.4.26 | project activation、marker、両catalog、同日付hook ledger |
| MarkItDown | 0.1.5 `[all]` | 0.1.6 | 0.1.6 | 0.1.6 | 全host local fixture変換 |
| gpt-connector | 0.4.7 ready | 0.4.7、live connector面unsupported | 同左 | 同左 | stdio contract、Mac両親consult回収receipt |
| aiterm-mcp | 0.19.2 ready | 0.19.2、PTY一覧unverified | 0.19.2、PTY一覧unverified | 0.19.2、PTY非適用 | 全host JSON-RPC initialize／diagnostics tool call、同日付execution receipt |
| codex-sidecar | 0.3.8 ready | 0.3.8 ready | 0.3.8 ready | 0.3.8、runtime store非適用 | 3 package一致、全host auditor read-only dry-run ready、同日付execution receipt |
| Lattice | 0.8.0 ready | 0.8.0 ready | 0.8.0 ready | 0.8.0 ready | native diagnostics、Lattice提供`codegraph_status` |

更新runの最終report IDはMac `15f61ecf-9258-450b-8c0e-14ab7de24eb4`、main-server
`baf318fd-60c4-492b-aae0-49eff4b4acf9`、FOX WSL2 `8a27a100-2e7b-4f5d-a232-c403e5e0f446`、
FOX Windows native `a47767e0-9332-4e17-ba25-501bacc93337`。4 hostともpackage更新は成功し、
更新後gateの不合格はcomponent別に再診断して上表の境界へ分離した。

## 親別connectorとproject限定面

- CaveatはMac、main-server、FOX WSL2でClaude MCP＋4 hooksとCodex 3 hooksがready。Windows nativeは
  Claude面とhook導入がreadyで、Codex CLI面はhost matrix上unsupportedである。private syncの
  `remote_mismatch`はmain-server／Windowsともローカル変更0件を確認後、正規`caveat sync`でreadyへ収束した。
- Throughlineは4 hostともdatabase v9、Codex hooks、restoreがready。Spotterの
  `throughline_context`も4 hostでpassした。
- Spotterはdotagents projectだけがactivation済みで、marker、Claude/Codex catalog、audit catalogが4 hostでpass。
  ADR 0075の同日付ledgerが`SessionStart`、`PreToolUse`、`Stop pass`、`SessionEnd`の実発火を保持する。
- gpt-connectorは4 hostでpresenceとstdio MCP contractがpass。専用Chromeを持たない3 hostのlive connector面は
  `live_connector_host_unsupported`であり、欠落へ読み替えない。MacはADR 0075とcross-parent evidenceで
  Codex／Claude両親から同一consult結果を再送なしで回収済みである。
- aitermとSidecarの外部実行は同日付execution evidenceを再利用する。writerは未実証のままで、read-only受入から
  writer権限を導出しない。
- Lattice提供`codegraph_status`は現セッションで`provider: lattice`、`sensor_owner: lattice`、
  `mode: daemon`を返した。sensor表示version `0.7.3-lattice.1`はpackage version 0.8.0と別の
  bundled sensor ABI表示として記録し、独立Codegraphの導入やfallbackには使わない。

## dotagents adapter修理

4 hostの更新後reportがaitermを`native_schema_invalid`へ投影した原因は、dotagentsのwire v4 adapterが
MCP initializeへ`jsonrpc: "4.0"`を送っていたことだった。MCPの正規JSON-RPC `2.0`へ修正し、
wire v4 regression testを追加した。修正後のMac scanはreport
`43052619-ac45-4421-a179-5ca2f1fad60a`でaiterm 0.19.2、MCP／PTY list／runtime error storeの3 componentがpassした。

これはdotagents所有adapterの修理であり、aiterm-mcp製品repoやLattice製品repoは変更していない。
残る3 hostへのdotagents revision rolloutは、ADR 0094で非目標としたclone/pull完全再現 `cf-0026`が所有する。

## 明示した非green境界

- MacのMarkItDownは`markitdown[all]` 0.1.5。通常upgradeは更新なし、0.1.6明示upgradeは第三者依存
  `azure-ai-contentunderstanding>=1.2.0b1`を解決できず失敗した。機能を減らすbase packageへの置換は行わず、
  local fixture passを受け入れた。第三者package解決のためdotagents ToDoは作らない。
- FOX Windows nativeのCaveatはCodex hooksを`feature_disabled`としてoverall `not_ready`にするが、同hostのCodex CLI面は
  matrix上unsupportedであり、Caveat presence、DB、sync、Claude MCP／hooksはready。全host factory gateの残件は
  既存maintenance `factory-master/fm-0645`に重複登録せず残す。
- main-server／FOX WSL2のaiterm PTY一覧はheadless環境でunverified、Windows nativeはPTY非適用。
  JSON-RPC initialize、diagnostics tool、package version、vendor依存の観測とは分離する。
- Windows Sidecarのruntime error storeはabsentでoverall unverifiedだが、3 package整合、workflow、preset、
  model policy、auditor read-only dry-runはready。execution-verified receiptをstate storeのgreenへ読み替えない。
- Codex CLI models cache不整合は既存`fm-0653`、toolchain ledgerのpost-gate cascadeは既存maintenanceの所有であり、
  コア8製品の成功へも本taskの新規欠陥へも混ぜない。

## 検証

- 4 hostの`agents-update`: core package更新成功、Throughline DB migration `already_current`
- 4 hostのfactory/native diagnostics: 上表のversion・component状態を確認
- 4 hostのaiterm MCP initialize／diagnostics: 応答成功
- 4 hostのSidecar factory diagnostics: package 0.3.8一致、auditor read-only dry-run ready
- 4 hostのMarkItDown local fixture: pass
- MacのLattice提供`codegraph_status`: provider／sensor ownerともLattice
- `node --test tests/lattice-cutover/wire-v4.test.mjs`: green
- `make lint`、`make ci`、`git diff --check`、GitHub Actionsは最終gateで閉じる

## 禁止面とrollback

Lattice製品・repoは変更していない。Latticeで見つけた欠陥を強行修理する経路も使っていない。
廃止済み`codex-rc`は利用・探索・復活せず、GitHub上の履歴だけを残す。

global package更新は正規package managerで旧versionを明示すればhost別に戻せる。Caveat syncはローカル変更0件で
remoteへ同期したため、戻す設定変更はない。dotagents adapter修理は本ADRを含むcommitのrevertで戻せる。
