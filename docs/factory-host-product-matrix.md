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

端末能力を担う8製品は全現役hostへ常備する。ServerManagerのsource/runtimeはmain-serverだけが必須で、他hostは管理clientとして接続するだけである。

| product | Mac | main-server | FOX WSL2 | FOX Windows native | 欠落severity |
|---|---|---|---|---|---|
| Caveat | required | required | required | required | high |
| Throughline | required | required | required | required | high |
| Spotter | required | required | required | required | high |
| Codegraph | required | required | required | required | high |
| MarkItDown | required | required | required | required | high |
| Oracle | required | required | required | required | high |
| aiterm-mcp | required | required | required | required | high |
| codex-sidecar | required | required | required | required | high |
| ServerManager | not_applicable | required | not_applicable | not_applicable | high（main-serverのみ） |

## 親別connector matrix

製品導入とconnector有効化を混同しない。CLIはrequiredでも、親の依存方向に反するconnectorはforbiddenになりうる。

| product | Claude親 | Codex親 |
|---|---|---|
| Caveat | MCP＋hook required | MCP＋hook required |
| Throughline | hook/CLI required | hook/skill/CLI required |
| Spotter | 対象projectで明示install required | 対象projectで明示install required |
| Codegraph | MCP required | MCP required |
| MarkItDown | CLI required | CLI required |
| Oracle | MCP required。browser runtime非対応hostはconnectorだけunsupported | skill/MCP required。browser runtime非対応hostはconnectorだけunsupported |
| aiterm-mcp | MCP required | Grok/Composer用MCP required。入れ子Codexは禁止 |
| codex-sidecar | MCP required | connector forbidden。Codex native subagentを使う |
| ServerManager | connector not_applicable | connector not_applicable |

Spotterは全projectへ無条件activationしない。dotagentsなど工場管理対象として明示したprojectではrequired、未指定projectでは未導入をissueにしない。Oracle connectorがbrowser runtime非対応でも、Oracle CLI自体の導入・version・`doctor --json`診断はrequiredのまま維持する。

## 2026-07-13 実測baseline

read-only SSHとlocal PATHで確認した。PATH文字列そのものは端末固有なのでBugHubへ送らず、診断結果だけを保持する。

| host | 8製品CLI | ServerManager | 備考 |
|---|---|---|---|
| Mac | 全8件解決 | not_applicable | MarkItDownはuv tool、それ以外は正規CLI |
| main-server | 全8件解決 | source/runtimeあり | Oracle connectorはbrowser runtime未整備のため再検証対象 |
| FOX WSL2 | login shellで全8件解決 | not_applicable | 非login SSHではnpm prefix PATHが復元されないため、scheduler診断はlogin相当env必須 |
| FOX Windows native | PowerShellで全8件解決 | not_applicable | `C:\Users\kite_\Documents\Program`をproject rootとして維持 |

## reporter profileへの写像

- `mac`: 上表Mac列
- `server`: 上表main-server列
- `wsl`: 上表FOX WSL2列
- `windows-native`: 上表FOX Windows native列

BugHub serverはhost credentialにprofileを結び付け、このmatrixから期待状態を決める。期待状態はclient payloadへ重複保持せず、serverだけがpresenceとの組合せとseverityを判定する。
