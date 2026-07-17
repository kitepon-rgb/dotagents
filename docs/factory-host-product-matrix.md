# 工場 host × product 期待matrix

更新日: 2026-07-18  
正本: dotagents  
対象: Mac、main-server、FOX WSL2、FOX Windows native

## 判定語彙

- `required`: そのhostで導入必須。欠落は`high`。
- `optional`: 能力は利用可能だが、そのhost/profileの成立条件ではない。欠落は`info`。
- `forbidden`: 依存方向または安全契約により有効化禁止。有効化を検出したら`high`。
- `unsupported`: 製品または上流platformが正規入口を提供しない。欠落扱いにせず、理由付き`info`。
- `not_applicable`: hostの役割に該当しない。issueを作らない。

## 製品導入matrix

端末能力を担うコア製品は全現役hostへ常備する（presence）。ただしhostの構造要因で成立しない**面**は、
presenceと分離してその面だけを理由付き`unsupported`にする（gpt-connector行の「connectorだけunsupported」
前例を一般化。2026-07-18裁定＝原則自体は維持し、面分離の明文だけを追加）。ServerManagerのsource/runtimeはmain-serverだけが必須で、他hostは管理clientとして接続するだけである。Claude Code CLI／Codex CLI／Grok Buildはコアと別の基盤toolchainであり、version・update・compatibility管理対象である。

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
| Lattice（編入中・第11） | required（wire v4 enrollまでreporter検査対象外） | 同左 | 同左 | CLI presenceのみrequired／**executor依存runtime面はunsupported**（Claude/Codex/Grok全toolchain不在の構造要因） | high（enroll後） |
| ServerManager | not_applicable | required | not_applicable | not_applicable | high（main-serverのみ） |
| Claude Code CLI | required | required | required | unsupported | high |
| Codex CLI | required | required | required | unsupported | high |
| Grok Build | optional | optional | optional | unsupported | info |

## 親別connector matrix

製品導入とconnector有効化を混同しない。外部実行connectorの4段階（installed→execution-verified）とwriter制限は[docs/02_models.md](02_models.md)「入口と使い分け」が正典。

| product | Claude親 | Codex親 |
|---|---|---|
| Caveat | MCP＋4 hooks required | native 3 hooks required（MCP不要） |
| Throughline | hook/CLI required | hook/skill/CLI required |
| Spotter | 対象projectで明示install required | 対象projectで明示install required |
| Codegraph | MCP required | MCP required |
| MarkItDown | CLI required | CLI required |
| gpt-connector | MCP `gpt_connector` required。専用Chrome非対応hostはconnectorだけunsupported | MCP `gpt_connector` required。timeout後は sessions 回収 |
| aiterm-mcp | MCP required | Codex/Grok/Composer用MCP required。native枠外の外部実行に使う |
| codex-sidecar | MCP required | MCP required。隔離worktreeの外部実行に使う |
| Lattice | MCP面（sensor 8 tool・`codegraph_*`名維持＝ADR 0049）はL7 wire v4 cutoverまで未配線。移行期間はCodegraph単独配線と二重配線を許す | 同左 |
| ServerManager | connector not_applicable | connector not_applicable |

Spotterは全projectへ無条件activationしない。dotagentsなど工場管理対象として明示したprojectではrequired、未指定projectでは未導入をissueにしない。委譲レーン・相談レーン・Oracleの位置付けは[docs/02_models.md](02_models.md)と[factory-product-contracts.md](factory-product-contracts.md)が正典（本matrixへ複製しない）。

## 診断とreportの扱い

端末ごとの実測結果（PATH解決・再検証状況）は端末固有状態としてBugHub／各端末の記録が保持し、本matrixへスナップショットを書かない。非login SSHでnpm prefix PATHが復元されずscheduler診断にlogin相当envが必要になる罠はcaveatが正。component health・post-update gate・issue化の挙動は[factory-reporter-runbook.md](factory-reporter-runbook.md)「v2 component health と post-update gate」が正典。

## reporter profileへの写像

- `mac`: 上表Mac列
- `server`: 上表main-server列
- `wsl`: 上表FOX WSL2列
- `windows-native`: 上表FOX Windows native列

BugHub serverはhost credentialにprofileを結び付け、このmatrixから期待状態を決める。期待状態はclient payloadへ重複保持せず、serverだけがpresenceとの組合せとseverityを判定する。
