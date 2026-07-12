# Factory reporter credential・設定ランブック

更新日: 2026-07-13  
正本: dotagents  
対象: Mac / main-server / FOX WSL2 / FOX Windows native

## 安全境界

- config未配置または`reporting.enabled=false`ではenqueueとnetwork送信を行わない。
- token、実config、outboxはgitへ入れない。tokenを引数、query parameter、通常JSON出力へ出さない。
- host identityはtop-level `host.id / host.profile`で固定し、tokenのserver-side bindingと一致させる。
- credential fileは所有者限定。POSIXはdirectory `0700`・file `0600`、Windowsは継承ACLを除去して現在userだけにする。
- 本番BugHubは`FACTORY_INGEST_ENABLED=true`を明示するまでfactory入口を404にする。

## 1. 送信OFFでconfigを配置

雛形は [examples/factory-reporter/](../examples/factory-reporter/) にある。秘密は含まず、collection/reportingともOFFである。

POSIX:

```bash
install -d -m 700 ~/.config/dotagents
install -m 600 examples/factory-reporter/mac.json ~/.config/dotagents/factory-reporter.json
```

main-serverは`main-server.json`、FOX WSL2は`fox-wsl.json`を使う。Windows nativeは`windows-workstation.json`を`%LOCALAPPDATA%\dotagents\factory-reporter\config.json`へコピーし、PowerShellでACLを限定する。

```powershell
$dir = "$env:LOCALAPPDATA\dotagents\factory-reporter"
New-Item -ItemType Directory -Force $dir | Out-Null
Copy-Item examples\factory-reporter\windows-workstation.json "$dir\config.json"
icacls $dir /inheritance:r /grant:r "${env:USERNAME}:(OI)(CI)F"
```

## 2. host credentialを発行

新codeをmain-serverへdeployした後、factory入口をONにする前でも発行できる。token staging directoryはrepo外のBugHub data bind内に作る。

```bash
ssh main-server 'install -d -m 700 /home/kite/bughub/data/credentials'
ssh main-server 'cd /home/kite/bughub && docker compose exec -T bughub node src/factory-admin.js provision --host-id mac-kite --profile mac --token-output /app/data/credentials/mac-kite.token'
```

4組の固定対応:

| host id | profile | token staging名 |
|---|---|---|
| `mac-kite` | `mac` | `mac-kite.token` |
| `main-server` | `server` | `main-server.token` |
| `fox-wsl` | `wsl` | `fox-wsl.token` |
| `windows-workstation` | `windows-native` | `windows-workstation.token` |

commandのJSON出力に含まれる`credential_id`は秘密ではない。revoke用に運用記録へ残す。token本文はstdoutへ出ない。

## 3. tokenを対象hostへ配置

POSIXの配置先:

```bash
install -d -m 700 ~/.config/dotagents/credentials
ssh main-server 'cat /home/kite/bughub/data/credentials/mac-kite.token' > ~/.config/dotagents/credentials/factory.token
chmod 600 ~/.config/dotagents/credentials/factory.token
```

対象hostでbyte数が0でないことだけを確認し、内容は表示しない。配置確認後、server上の平文staging fileを削除する。

```bash
test -s ~/.config/dotagents/credentials/factory.token
ssh main-server 'rm -f /home/kite/bughub/data/credentials/mac-kite.token'
```

Windows nativeは`scp`で`%LOCALAPPDATA%\dotagents\factory-reporter\credential`へ直接保存し、directoryとfileへ現在userだけのACLを設定する。WSL側tokenとWindows native tokenを共用しない。

## 4. 明示ON

reporter configの`reporting`を次の形へ編集する。tokenが存在するだけではONにならない。

```json
{
  "enabled": true,
  "endpoint": "http://192.168.1.2:39310/api/factory/v1/reports",
  "credential_file": "/home/kite/.config/dotagents/credentials/factory.token"
}
```

Windowsでは`credential_file`にWindows nativeの絶対pathをJSON escapingして指定する。次にmain-serverの`~/bughub/.env`へ`FACTORY_INGEST_ENABLED=true`を追加し、ServerManagerの`bughub/deploy.sh`をまず引数なしでdry-run、削除一覧確認後だけ`--apply`する。

## 5. rotation

既定24時間は旧tokenも有効にし、新tokenの配置成功後に切り替える。

```bash
ssh main-server 'cd /home/kite/bughub && docker compose exec -T bughub node src/factory-admin.js rotate --host-id mac-kite --grace-hours 24 --token-output /app/data/credentials/mac-kite.next.token'
```

新tokenを対象hostの一時fileへ転送し、`0600` / ACLを確認してからcredential fileへatomic renameする。送信成功を確認後、server staging fileを削除する。旧tokenの即時無効化が必要なら、発行時に記録した旧`credential_id`を使う。

```bash
ssh main-server 'cd /home/kite/bughub && docker compose exec -T bughub node src/factory-admin.js revoke --credential-id <旧credential_id>'
```

## 6. 紛失・停止・rollback

- credentialだけを止める: `factory-admin.js revoke --credential-id <id>`。
- host全体を廃止する: `factory-admin.js retire-host --host-id <host>`。active credentialを同時にrevokeする。
- reporter送信だけを止める: configの`reporting.enabled=false`。既存outboxは削除しない。
- server入口を止める: `FACTORY_INGEST_ENABLED`を削除またはfalseにして、dry-run後に再deployする。既存pull collectorは継続する。
- token漏洩時はrotation猶予を使わず旧credentialを即revokeし、server staging・対象host tokenを置換する。

秘密を含むfileの削除・転送、`.env`変更、factory入口ON、本番deployは端末ごとのH確認を伴う。通常のinstall/updateがこれらを暗黙に実行してはならない。

## 7. 日常の正規実行順序

scan、preview、enqueue、flushは別操作である。`reporting.enabled=false`のままでもscan/previewは実行でき、いずれもnetwork I/Oを行わない。

```bash
# 1. read-only scan。outputはcredential/outboxと別の所有者限定pathへ置く。
umask 077
factory-scan --config ~/.config/dotagents/factory-reporter.json \
  --output ~/.local/state/dotagents/factory-reporter/latest-report.json

# 2. 送らずにschema・host identity・privacyを確認する。
factory-reporter preview \
  --config ~/.config/dotagents/factory-reporter.json \
  --report ~/.local/state/dotagents/factory-reporter/latest-report.json

# 3. 明示ON済みの時だけoutboxへ保存する。OFFなら成功終了でもenqueued=false。
factory-reporter enqueue \
  --config ~/.config/dotagents/factory-reporter.json \
  --report ~/.local/state/dotagents/factory-reporter/latest-report.json

# 4. 明示ON済みの時だけnetwork送信。accepted確認後だけoutboxから削除する。
factory-reporter flush --config ~/.config/dotagents/factory-reporter.json
```

`preview`は常にnetworkゼロである。`enqueue`と`flush`はOFFならnetworkゼロで、既存outboxを消さない。tokenの存在、scheduler、過去のON状態は送信許可にならない。

### exitと出力の扱い

- `factory-scan`非0: config/profile、dotagents revision、report schema、atomic outputのいずれかに失敗した。outputの成功扱い・enqueueはしない。個別製品CLIの不在・非対応はreport全体を偽成功/失敗へ丸めず、その製品を`unverified`として残す。
- `factory-reporter`非0: stdoutの`{ok:false,code:"FACTORY_REPORTER_ERROR"}`とstderrを確認する。409/413/422はdead-letter、401/403/429/5xx/timeout/networkはoutbox保持であり、成功ではない。
- stdout JSONは機械判定用で、token本文を出さない。report JSONには秘密・prompt・absolute pathを入れない。
- config、credential、state/outbox、scan outputは0700 directory/0600 file（Windowsは現在userのみACL）にする。reportを共有・git add・チャット貼付けしない。

## 8. 定期scheduler（dry-runから開始）

`factory-reporter-scheduler` は `collection.enabled=true` の時だけ scan → enqueue → flush を毎時17分に起動するOS別schedulerを管理する。収集OFF時はscan前に正常skipし、state/outboxにも触れない。設定を作成・変更せず、`collection.enabled`／`reporting.enabled`をONにしない。送信OFFならrunnerのenqueue/flushは既存契約どおりnetwork I/Oをしない。

最初は必ずdry-runで生成物・登録commandを確認する。実登録は明示`--apply`だけであり、通常のinstall/updateはschedulerを登録しない。configが未配置または不正ならinstall/runnerはfail closedで、scheduler登録もscanも行わない。停止のためのuninstallだけはconfigなしでも実行できる。

```bash
# macOS
factory-reporter-scheduler install --dry-run --platform darwin
# Linux / WSL2
factory-reporter-scheduler install --dry-run --platform linux
# Windows native PowerShell
factory-reporter-scheduler install --dry-run --platform win32
```

承認済みの対象hostだけで、dry-runの出力を確認してから同じcommandに`--apply`を付ける。`--apply`は実行中OSと一致するplatformだけを受け付ける。

- macOS: `~/Library/LaunchAgents/com.kite.factory-reporter.plist`を`launchctl bootstrap gui/$UID`で登録する。`node`の絶対path → runnerの絶対pathをXML escapeした引数配列で起動する。state/logは`$XDG_STATE_HOME/dotagents/factory-reporter/`（既定`~/.local/state/...`）で0700。
- Linux / WSL2: 現在userのcrontabに`# dotagents-factory-reporter`で終わる**完全一致の自管理行だけ**を置換する。cron最小環境でもNodeとrunnerの絶対pathをPOSIX single-quoteして起動する。WSL2ではcron service自体を別途常設する。
- Windows native: `%LOCALAPPDATA%\dotagents\factory-reporter\scheduler\dotagents-factory-reporter.xml`をUTF-8で生成し、毎時のTaskを`schtasks.exe /Create /TN dotagents-factory-reporter /XML <file> /F`で登録する。apply時は継承・既存明示ACEを外し、現在userのSIDだけを許可するprivate ACLをPowerShell/.NETで設定する。

停止はoutboxを消さずschedulerだけ外す。`factory-reporter-scheduler uninstall --dry-run --platform <OS>`で対象commandを確認し、承認後に`--apply`を付ける。

## 9. agents-updateとの接続

`agents-update`はcurated packageとMarkItDownの更新をすべて試した後、`factory-reporter-schedule-runner --config <host config>`を必ず1回呼ぶ。runnerが担う順序はscan → enqueue → flushであり、更新途中のnpm/uv失敗やnpm自体の不在でもreporter呼び出しを省略しない。

- 既定configはPOSIXで`~/.config/dotagents/factory-reporter.json`、Windows nativeで`%LOCALAPPDATA%\dotagents\factory-reporter\config.json`。
- `collection.enabled=false`ならrunnerがscan前に正常skipする。`reporting.enabled=false`ならenqueue/flushはnetworkへ出ない。
- config欠落・runner欠落・scan/report失敗はreport失敗としてログに残す。更新成功をreport成功で代用せず、report成功を更新成功で代用しない。
- 最終行直前の`agents-update result: update=<success|failed> report=<success|failed>`で両系統を判定でき、どちらかが`failed`なら終了codeは1。
- 試験時だけ`FACTORY_REPORTER_RUNNER`と`FACTORY_REPORTER_CONFIG`で入口を差し替えられる。通常運用でこのoverrideを使わない。

この接続はschedulerを新規登録せず、configを作成・変更せず、collection/reportingをONにしない。実hostへのconfig・credential配置とON操作は前節までのH手順で別途行う。
