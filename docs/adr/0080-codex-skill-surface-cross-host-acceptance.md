# ADR 0080: Codex skill面の4 host受入

- Status: Accepted
- Date: 2026-07-20
- Scope: Lattice `codex-full-support` (`cf-0113`, `cf-0114`, `cf-0156`)
- Inputs: `install.sh`、`bin/verify-install.sh`、4 host実査、新規Codexセッションの`/skills`

## Decision

Codex skillの公式配布面を`$HOME/.agents/skills`、端末固有skillの保存面を`$HOME/.codex/skills`として分離する既存契約について、Mac、main-server、FOX WSL2、FOX Windows nativeの4 hostで現在値を実査した。dotagents所有の公式skill 6件は各hostで一つの公式面からcanonical contentを参照し、同名のlegacy entryは存在しない。

公式skill 6件は次のとおり。

- `auto-deploy-on-push`
- `gpt-connector`
- `oracle`
- `orchestrate`
- `polish-github`
- `run-observer-parent-watch`

| host | 公式面 | legacy面に保存された端末固有entry | 同名衝突 | rollback証拠 |
|---|---|---|---:|---|
| Mac | 6 symlink → `/Users/kite/Developer/dotagents/codex/skills/...` | `.system`, `codex-thread-handoff-smoke`, `throughline` | 0 | `dotagents-codex-skill-migration-20260712T140950Z.tar.gz` |
| main-server | 6 symlink → `/home/kite/Developer/dotagents/codex/skills/...` | `.system`, `throughline` | 0 | `dotagents-rollout-20260712T145043Z.tar.gz` |
| FOX WSL2 | 6 symlink → `/home/kite/Developer/dotagents/codex/skills/...` | `.system`, `throughline` | 0 | `dotagents-wsl-rollout-20260713T004426+0900.tar.gz` |
| FOX Windows native | 6 SymbolicLink → `C:\Users\kite_\Documents\Program\dotagents\codex\skills\...` | `.system`, `throughline` | 0 | `dotagents-windows-pre-codex-rollout-20260713T005836.tar.gz`ほか |

Mac、main-server、FOX WSL2では`bin/verify-install.sh --profile official`がgreen。FOX Windows nativeはPowerShellからlink種別・target・legacy面・衝突0件を直接検査した。

## New-session receipt

MacでCodex CLI v0.144.6の新規セッションを起動し、変更判定された6 hookを一括承認せず、各eventの正規commandを目視してtrustした。最終状態はPreToolUse 1/1、PostToolUse 2/2、SessionStart 4/4、UserPromptSubmit 4/4、Stop 4/4でreview残数0だった。

その後`/skills`の`List skills`からselectorを開き、上記6件がそれぞれ`Skill`として表示されることを確認した。これにより、repository上にファイルがあるだけでなく、新しいCodexセッションが公式面のskillを発見できることを受け入れる。

## Evidence exclusions

- FOX Windows native上でWSL用bash verifierをPowerShellから誤って実行した結果は、path semanticsが異なる不正な入口によるFAILであり、成功証拠にも製品欠陥にも用いない。Windows nativeの受入にはPowerShellによるnative link実査だけを使う。
- remote cloneがorigin/mainより12 commit遅れていたhostがある。この差分は現在のlink一意性を否定しないため本3 taskの受入から分離するが、host更新済みという広い主張には使わない。
- 新規セッションでは`sprite-forge` MCPがHTTP 501でstartup incompleteになった。この問題はskill discoveryと独立しており、本ADRでは成功へ丸めず、既存保守項目との重複を確認して別taskとして扱う。
- 本ADRは全Codex入口のE2E、全skillの実呼出し、MCP全件green、全host clone最新版を証明しない。

## Task closure

`cf-0113`、`cf-0114`、`cf-0156`をそれぞれ独立した`start`→`done` transactionで閉じ、同じADR evidence descriptorを関連づける。旧Markdownへcheckboxを戻さず、工程状態の正本はLattice storeに維持する。
