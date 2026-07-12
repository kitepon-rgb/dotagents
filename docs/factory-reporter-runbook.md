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
