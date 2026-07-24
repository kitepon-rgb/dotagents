# AIShell工場編入の受入matrix（2026-07-25）

裁定は [ADR 0118](../adr/0118-aishell-factory-profile-and-control-v1-closure.md)。本書は実測値だけを載せる。
未実行の検証を green と書かない。

## 公開面

| 起動形式 | tool数 | `factory_diagnostics` | 実測 |
|---|---|---|---|
| 既定（profile未指定） | 7 | 含まない | pass |
| `AISHELL_CAPABILITY_SET=expanded-v1` | 11 | 含まない | pass |
| `AISHELL_TOOL_PROFILE=full` | 25 | 含まない | pass |
| `AISHELL_TOOL_PROFILE=legacy` | 25 | 含まない | pass |
| `AISHELL_TOOL_PROFILE=factory` | 1 | これだけ | pass |
| `factory` × `expanded-v1` | — | 起動拒否 | `FACTORY_PROFILE_CAPABILITY_SET_UNSUPPORTED` |

## 診断payload（公開版 0.4.1・bare command名起動）

- `serverInfo`: `{"name":"aishell-macos","version":"0.4.1"}`
- top-level キー数: 9（exact）／`schemaVersion`: `aishell.native_factory_diagnostics.v1`
- `product`: `{"identifier":"aishell","version":"0.4.1"}`
- `manager.applicationBundleState`: `available`／`runtime.operationReadiness`: `ready`
- `privacy` 4項目すべて `false`
- `ready`: `true`／`issues`: `[]`
- 絶対path露出: **0件**（`/Users/` 出現なし）

## dotagents adapter（公開版に対する実測）

- `presence_status`: `installed`
- `installed_version`: `0.4.1`
- `state_schema_version`: `aishell.runtime_configuration.v2`
- `migration_status`: `current`
- `checks`: `[{"check_id":"native_diagnostics","status":"pass"}]`

publish前は同じadapterが `unverified` / `native_schema_invalid` を返した。導入済み0.3.6にfactory profileが
無いためであり、`missing` でも偽の ready でもない状態を返すことを確認している。

## gate

| gate | 結果 |
|---|---|
| dotagents `make lint` | ALL PASS |
| dotagents `tests/factory-scan/*.test.mjs` | 83 pass / 0 fail |
| dotagents `tests/orchestrate/*.test.mjs` | 206 pass / 0 fail |
| dotagents `tests/factory-core/smoke.sh` | OK |
| dotagents `tests/update/cron-env.sh` | OK |
| AIShell `swift test` | 541 pass / 0 fail |
| AIShell `scripts/verify-npm-package.mjs` | exit 0 |
| AIShell `scripts/verify-release-commit.mjs` | exit 0 |

### gateが実際に捕まえた欠陥

- **version drift**: 0.4.0 bump 時に `Packaging/Info.plist` の `CFBundleShortVersionString` が 0.3.6 のまま
  取り残されているのを検出した。
- **bare command名でのbundle解決失敗**: 0.4.0 の公開後smokeで `manager.application_bundle_unavailable` /
  `ready:false` を観測。原因は `argv[0]` 依存のbundle探索で、PATH経由のbare名起動ではargv[0]がpathを
  含まないためCWD相対に解決して失敗する。MCP hostも工場adapterもこの起動形式を使うため、健全な
  installationが常にnot_ready判定になる。0.4.1 で `Bundle.main.executableURL` へ切替えて修理し、
  release gateへbare名起動の検証段を追加した。修正を一時的に戻すとgateが
  `AIShell.app must resolve when argv[0] carries no directory component` で落ちることを確認済み。
  この欠陥は診断面の追加によるregressionではなく、同じ探索を使う `runtime_open_manager` が以前から
  壊れていたものが可視化されたものである。罠DB `macos-argv-0-bundle-bare-command-mcp-server` へ還流済み。
- **adapterの配線欠落**: dotagents adapter が profile 指定なしで `aishell-mcp` を起動していたため、既定
  catalogでは未定義toolになる状態だった。fake runnerのtestがenvを検証していなかったため通過していた。
  配線を修正し、`AISHELL_TOOL_PROFILE=factory` の指定をtestで固定した。

## 公開

- `@quolu/aishell@0.4.0` — factory profile の追加（SemVer minor）
- `@quolu/aishell@0.4.1` — bare command名でのbundle解決修理。`dist-tags.latest` = 0.4.1
- registry の `bin` 2本（`aishell-mcp` / `aishell-open`）が publish 後も生存していることを確認
  （既知の罠 `npm-bin-leading-dot-can-be-stripped-on-publish` は再発せず）
- AIShell tag `v0.4.0` / `v0.4.1` を push 済み

## 未了

- ServerManager の AIShell optional source は未着地 branch `kitepon-rgb/aishell-optional-source` にあり、
  本番 deploy もそこから行われていた。再着地は別の作業単位とする。
- wire v5 への正式 enroll は別波と裁定済み。
- 工場コア製品7つのうち publish 祖先 gate を持つのは AIShell のみ。残り6製品は次の release wave で導入する。
