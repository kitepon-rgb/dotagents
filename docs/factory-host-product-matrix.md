# 工場 host × product 期待matrix

更新日: 2026-07-13  
正本: dotagents  
対象: Mac、main-server、FOX WSL2、FOX Windows native

## 判定語彙

- `required`: そのhostで導入必須。欠落は`high`。
- `optional`: 能力は利用可能だが、そのhost/profileの成立条件ではない。欠落は`info`。
- `forbidden`: 依存方向または安全契約により有効化禁止。有効化を検出したら`high`。
- `unsupported`: 製品または上流platformが正規入口を提供しない。欠落扱いにせず、理由付き`info`。
- `not_applicable`: hostの役割に該当しない。issueを作らない。

## 製品導入matrix

端末能力を担う8製品は全現役hostへ常備する。ServerManagerのsource/runtimeはmain-serverだけが必須で、他hostは管理clientとして接続するだけである。Claude Code CLI／Codex CLI／Grok Buildはコアと別の基盤toolchainであり、version・update・compatibility管理対象である。

| product | Mac | main-server | FOX WSL2 | FOX Windows native | 欠落severity |
|---|---|---|---|---|---|
| Caveat | required | required | required | required | high |
| Throughline | required | required | required | required | high |
| Spotter | required | required | required | required | high |
| Codegraph | required | required | required | required | high |
| MarkItDown | required | required | required | required | high |
| gpt-connector | required | required | required | required | high |
| aiterm-mcp | required | required | required | required | high |
| codex-sidecar | required | required | required | required | high |
| ServerManager | not_applicable | required | not_applicable | not_applicable | high（main-serverのみ） |
| Claude Code CLI | required | required | required | unsupported | high |
| Codex CLI | required | required | required | unsupported | high |
| Grok Build | optional | optional | optional | unsupported | info |

## 親別connector matrix

製品導入とconnector有効化を混同しない。CLIはrequiredでも、親の依存方向に反するconnectorはforbiddenになりうる。

| product | Claude親 | Codex親 |
|---|---|---|
| Caveat | MCP＋4 hooks required | native 3 hooks required（MCP不要） |
| Throughline | hook/CLI required | hook/skill/CLI required |
| Spotter | 対象projectで明示install required | 対象projectで明示install required |
| Codegraph | MCP required | MCP required |
| MarkItDown | CLI required | CLI required |
| gpt-connector | MCP `gpt_connector` required。専用Chrome非対応hostはconnectorだけunsupported | MCP `gpt_connector` required。timeout後は sessions 回収 |
| aiterm-mcp | MCP required | Grok/Composer用MCP required。入れ子Codexは禁止 |
| codex-sidecar | MCP required | connector forbidden。Codex native subagentを使う |
| ServerManager | connector not_applicable | connector not_applicable |

Spotterは全projectへ無条件activationしない。dotagentsなど工場管理対象として明示したprojectではrequired、未指定projectでは未導入をissueにしない。gpt-connectorは専用Chrome、product-owned state、明示model/effort、caller既知slugを必須とし、timeout時は sessions で回収する。Oracleはv1互換・手動rollback専用で、通常matrixには含めない。

## 2026-07-13 実測baseline

read-only SSHとlocal PATHで確認した。PATH文字列そのものは端末固有なのでBugHubへ送らず、診断結果だけを保持する。

| host | 8製品CLI | ServerManager | 備考 |
|---|---|---|---|
| Mac | 旧Oracleを含む全8件解決 | not_applicable | gpt-connector／基盤CLIは切替前の再検証対象 |
| main-server | 旧Oracleを含む全8件解決 | source/runtimeあり | gpt-connector connectorは再検証対象 |
| FOX WSL2 | 旧Oracleを含む全8件解決 | not_applicable | 非login SSHではnpm prefix PATHが復元されないため、scheduler診断はlogin相当env必須 |
| FOX Windows native | PowerShellで旧Oracleを含む全8件解決 | not_applicable | gpt-connector／基盤CLIは未検証 |

## reporter profileへの写像

- `mac`: 上表Mac列
- `server`: 上表main-server列
- `wsl`: 上表FOX WSL2列
- `windows-native`: 上表FOX Windows native列

BugHub serverはhost credentialにprofileを結び付け、このmatrixから期待状態を決める。期待状態はclient payloadへ重複保持せず、serverだけがpresenceとの組合せとseverityを判定する。
