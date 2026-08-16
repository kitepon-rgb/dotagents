# 工場 host × product 期待matrix

更新日: 2026-08-16
正本: dotagents
対象: Mac、main-server、FOX WSL2、FOX Windows native

## 判定語彙

- `required`: そのhostで導入必須。欠落は`high`。
- `optional`: 能力は利用可能だが、そのhost/profileの成立条件ではない。欠落は`info`。
- `forbidden`: 依存方向または安全契約により有効化禁止。有効化を検出したら`high`。
- `unsupported`: 製品または上流platformが正規入口を提供しない。欠落扱いにせず、理由付き`info`。
- `not_applicable`: hostの役割に該当しない。issueを作らない。

## 製品導入matrix

端末能力を担う自作コアと第三者管理製品は、対応する現役hostへ常備する（presence）。ただしhostの構造要因で成立しない**面**は、
presenceと分離してその面だけを理由付き`unsupported`にする（gpt-connector行の「connectorだけunsupported」
前例を一般化。2026-07-18裁定＝原則自体は維持し、面分離の明文だけを追加）。ServerManagerのsource/runtimeはmain-serverだけが必須で、他hostは管理clientとして接続するだけである。Claude Code CLI／Codex CLI／Grok Buildはコアと別の基盤toolchainであり、version・update・compatibility管理対象である。

| product | Mac | main-server | FOX WSL2 | FOX Windows native | 欠落severity |
|---|---|---|---|---|---|
| Caveat | required | required | required | required | high |
| Throughline | required | required | required | required | high |
| Spotter | required | required | required | required | high |
| MarkItDown | required | required | required | required | high |
| gpt-connector | required | required | required | required | high |
| aiterm-mcp | required | required | required | required | high |
| codex-sidecar | required | required | required | required | high |
| Lattice | required | required | required | required | high |
| AIShell | required（Apple Silicon / macOS 15+） | unsupported（macOS native API不在） | unsupported（同左） | unsupported（同左） | high（対応Macのみ） |
| Observer | required（macOS） | unsupported（v1 platform support外） | unsupported（同左） | unsupported（同左） | high（対応Macのみ） |
| ServerManager | not_applicable | required | not_applicable | not_applicable | high（main-serverのみ） |
| peertable | required（client。実測済み） | required（server。`deploy/compose.yaml`でcompose常駐） | required（client。2026-08-10実測済み） | required（client。2026-08-10実測済み） | high |
| Claude Code CLI | required | required | required | unsupported | high |
| Codex CLI | required | required | required | required | high |
| Grok Build | optional | optional | optional | optional | info |

## 親別connector matrix

製品導入とconnector有効化を混同しない。外部実行connectorの4段階（installed→execution-verified）とwriter制限は[docs/02_models.md](02_models.md)「入口と使い分け」が正典。

Grok親列はWave 1〜5の実測を書く。工場の4席（Mac / Windows native / WSL2 / Linux）は全部本線。Mac新規session（2026-08-16 `01a0091e`）で工場MCP 6は session 面 connected。FOX WSL2新規session（2026-08-16 `01a00964`）は工場5 connected、aishellはtyped `spawn_failed`（WSLは製品どおりunsupported）。Windows nativeのGrok親配線とlogin済みapplyは着地。適用後の新規session受入は残H。`required`はGrok所有が`install`で証明された面。handshakeの人の目は新規sessionだけを数え、`grok mcp doctor`成功をsession成功に読み替えない。2026-08-14のGF07 12製品matrix（`supported` / `partial` を含む）は到達性の履歴であり、本列へ写してgreenへ丸めない。既存Grok sessionの見た目は受入に数えない。

| product | Claude親 | Codex親 | Grok親 |
|---|---|---|---|
| Caveat | MCP＋4 hooks required | native 3 hooks required（MCP不要） | MCP required（Wave 3 `grok mcp doctor` healthy）。製品hook unsupported（Wave 4 / 8/14 no-op） |
| Throughline | hook/CLI required | hook/skill/CLI required | unsupported（製品hookは起動しない。hook captureはWave 6） |
| Spotter | 対象projectで明示install required | 対象projectで明示install required | unsupported（8/14正式host棄却。製品hookは起動しない） |
| MarkItDown | CLI required | CLI required | not_applicable（Grok固有connector面なし） |
| gpt-connector | MCP `gpt_connector` required。専用Chrome非対応hostはconnectorだけunsupported | MCP `gpt_connector` required。timeout後は sessions 回収 | MCP required（Wave 3 `grok mcp doctor` healthy） |
| aiterm-mcp | MCP required | Codex/Grok/Composer用MCP required。native枠外の外部実行に使う | MCP required（Wave 3 `grok mcp doctor` healthy）。日常shellはGrok native |
| codex-sidecar | MCP required | MCP required。隔離worktreeの外部実行に使う | MCP required（Wave 3 `grok mcp doctor` healthy）。隔離Codex実行用 |
| Lattice | required。`lattice-mcp`のsensor 8 toolを配線。`codegraph_*`互換名はLattice提供者identityを返す | 同左。Windows nativeは親CLIを運用する端末だけMCP登録 | MCP required（Wave 3 `grok mcp doctor` healthy）。`lattice-gantt`はdotagents所有の案内。`lattice hooks install --host` のGrok hostは増やさない＝製品host hook unsupported |
| AIShell | MCP `aishell` required（Apple Silicon / macOS 15+のみ）。`AISHELL_CAPABILITY_SET=expanded-v1`で登録し、工場監視はpath非露出の`AISHELL_TOOL_PROFILE=factory`を使う | 同左 | MCP required（Apple Silicon / macOS 15+のみ。Wave 3 `grok mcp doctor` healthy）。他hostはunsupported |
| Observer | macOSでStop hookとparent watchをversioned fragmentからH適用。同provider familyの伴走専用 | 同左。`run-observer-parent-watch`を正規入口とし、一般Worker・Control票へ混ぜない | unsupported（同provider family専用。Grok面なし。Wave 6） |
| ServerManager | connector not_applicable | connector not_applicable | connector not_applicable |
| peertable | team編成時（peertable setup）だけMCP `room` required。teardownで解除 | 同左 | unsupported（Wave 2: roomはClaude面のまま。Grok所有のroom MCPなし） |

独立Codegraphは全hostで退役済みであり、製品・connector期待matrixへ含めない。BugHubの既存履歴だけを
`not_applicable`として保持する。Latticeの`codegraph_*` tool名はLattice所有の入力互換ABIであり、
独立Codegraph MCP登録を意味しない。

Grok親列は工場の4席が対象である。Grok Buildの導入は4席とも`optional`（未loginで一撃展開を止めない。loginと`apply-grok-config`はH）。Windows nativeの適用後新規session受入は残H。製品または上流が正規入口を持たない面だけを`unsupported`にする。Grok親の憲法・skill・工場MCP・工場hookは`~/.grok`が所有し、`compat.claude.agents`と`compat.claude.hooks`は切る。`compat.claude.skills`と`compat.claude.mcps`は切らない。

Spotterは全projectへ無条件activationしない。dotagentsなど工場管理対象として明示したprojectではrequired、未指定projectでは未導入をissueにしない。peertableも同様にteam編成（`peertable setup`）した対象projectだけがMCP `room`のrequired対象で、未編成projectでの未導入をissueにしない。FOX WSL2／FOX Windows nativeのclient稼働は2026-08-10のwire v7 cutoverで実測済み（installed/compatible）となり、宣言どおり`required`へ昇格した。委譲レーン・相談レーン・Oracleの位置付けは[docs/02_models.md](02_models.md)と[factory-product-contracts.md](factory-product-contracts.md)が正典（本matrixへ複製しない）。

## 診断とreportの扱い

端末ごとの実測結果（PATH解決・再検証状況）は端末固有状態としてBugHub／各端末の記録が保持し、本matrixへスナップショットを書かない。非login SSHでnpm prefix PATHが復元されずscheduler診断にlogin相当envが必要になる罠はcaveatが正。component health・post-update gate・issue化の挙動は[factory-reporter-runbook.md](factory-reporter-runbook.md)「v2 component health と post-update gate」が正典。

## reporter profileへの写像

- `mac`: 上表Mac列
- `server`: 上表main-server列
- `wsl`: 上表FOX WSL2列
- `windows-native`: 上表FOX Windows native列

BugHub serverはhost credentialにprofileを結び付け、このmatrixから期待状態を決める。dotagentsの`lib/factory/deployment-contract.mjs`も同じ12管理製品・host projectionを更新後gateとverify-installへ供給し、profile/OS/arch/macOS majorがmatrix外なら停止する。期待状態はclient payloadへ重複保持せず、serverだけがpresenceとの組合せとseverityを判定する。

## host別展開と定期更新

製品集合は上表とdeployment contractが共有するが、host配線は次の入口が個別に所有する。
WSL2とWindows nativeは同一物理端末でも別hostとして扱い、設定・credential・scheduler・receiptを共有しない。

| host | 一撃展開 | 定期更新 | 実host受入 |
|---|---|---|---|
| Mac | `setup-macos-factory.sh` | LaunchAgent `com.kite.agents-update`、毎週月曜04:00 | `verify-install`、15製品、fresh v7 delivery |
| main-server | `setup-linux-factory.sh` | cron `# dotagents-agents-update-linux`、毎日02:00 | `server` profile、ServerManager local readiness/revision、15製品、fresh v7 delivery |
| FOX WSL2 | `setup-wsl-factory.sh` | cron `# dotagents-agents-update-wsl`、毎日02:00 | batch token、15製品、fresh v7 delivery |
| FOX Windows native | `setup-windows-native-factory.ps1` | Task `dotagents-agents-update`、毎日02:00 | 実Task smoke、終了code、15製品、fresh v7 delivery |
