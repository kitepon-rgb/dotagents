# WSL relay の SSH banner timeout

- 出典: Microsoft Learn, “Basic commands for WSL”
- URL: https://learn.microsoft.com/en-us/windows/wsl/basic-commands
- 取得日: 2026-07-14
- 確度: 高（Microsoft一次資料＋FOX Windows/WSL 2.6.1実機診断）
- raw: [raw/microsoft-wsl-basic-commands.md](raw/microsoft-wsl-basic-commands.md)

## 実機症状

`fox-wsl`はMacから`windows-workstation`をProxyJumpし、Windows localhost:2222へ接続する。Windowsの`wslrelay.exe`は127.0.0.1/`::1`:2222をlistenするが、SSHはbanner timeoutになる。WSL側の`ssh.socket`は0.0.0.0/`[::]`:2222でactiveなのに`NAccepted=0`で、socket restart後も変わらない。認証やsshdではなくWindows↔WSL relay層で止まっている。

WSL内には長時間稼働中のCodex app-server/proxyが複数ある。Microsoftが公開する停止入口は対象distributionを止める`wsl --terminate <Distribution Name>`と、全distribution＋WSL 2 VMを即時停止する`wsl --shutdown`である。relay単体をrefresh/re-registerする公開入口は確認できないため、稼働processがある間にこれらを実行しない。

## 運用裁定

rolloutはWindows hostの正規`wsl.exe -d Ubuntu-26.04 --exec ...`入口で継続できるが、直SSH復旧とは別扱いにする。直SSHはCodex app-server等を安全に終了できるmaintenance windowでだけWSLを再起動し、`wslrelay.exe`再生成、Windows localhost listener、`ssh fox-wsl`成功、WSL `ssh.socket`のaccept増加を確認する。代替入口の成功でbanner timeoutを解消扱いにしない。
