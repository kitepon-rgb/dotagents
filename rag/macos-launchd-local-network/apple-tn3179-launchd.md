# macOS launchd agent と Local Network Privacy

- 出典: Apple Developer Technote TN3179, “Understanding local network privacy”
- URL: https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy
- 取得日: 2026-07-14
- 確度: 高（Apple一次資料＋macOS 26.5.1実機再現）
- raw: [raw/apple-tn3179.json](raw/apple-tn3179.json)
- 取得方法: 通常URLの`markitdown`は128 bytesのJS shellしか得られなかったため、Apple DocCの一次JSON endpointを`curl`で保存した。

## 結論

macOS 15以降、Terminal/SSHから起動したcommand-line toolとuser `launchd` agentはLocal Network Privacy上で同じ扱いではない。Terminal/SSHとその子は自動許可されるが、LaunchAgentは許可状態が未確定・拒否ならLAN接続を遮断される。

このMacでは同じ`/opt/homebrew/bin/node`から`http://192.168.1.2:39310/readyz`へ接続した時、対話shellはHTTP 200、`launchctl submit`配下はnetwork error（診断exit 43）になった。factory reporterのlaunchd runだけoutboxをretainし、同じentryを対話shellからflushすると送信できる現象と一致する。

## Appleが定める正規策と制約

- `SMAppService`を使わないLaunchAgentは、plistの`AssociatedBundleIdentifiers`でresponsible codeをOSへ知らせる。
- program identityを安定追跡させるにはApple-issued code-signing identityを使う。Homebrew NodeはこのMacでad-hoc署名、TeamIdentifierなしのため、Node binaryを恒久identityとして扱うのは不安定。
- 短命processが最初のLAN失敗直後に終了すると、許可alertを表示できない既知問題がある。単純な短時間retryだけを無人運用の恒久策にしない。
- 管理端末・CI向けには`com.apple.network.local-network`の`AllowedEthernetLocalNetworkAddresses` / `AllowedWiFiLocalNetworkAddresses`へCIDRを設定できる。全programへ効くsystem設定で、`sudo`と再起動が必要。適用時は宛先だけでなく実際に使うinterface種別にも限定する。このMacからBugHub hostへの実経路は`en5`（USB Ethernet）なので、今回は`AllowedEthernetLocalNetworkAddresses`へ`192.168.1.2/32`だけを追加し、Wi-Fi側は変更しない。

## dotagentsへの含意

Mac schedulerのinstall成功だけを稼働成功にしない。launchd配下の実送信を必須canaryにする。現構成では、署名済みdotagents app bundleを新設するより、個人管理端末のhomelab endpoint一個を実経路のinterface種別に限って`/32`で許可する方が小さい。ただしそのinterface上の全processへ効くsystem変更と再起動を伴うため、適用・rollbackを明示して実行する。将来Wi-Fiへ経路変更する場合は、同じCIDRであっても別のH変更として追加裁定する。

rollbackは`AllowedEthernetLocalNetworkAddresses`から対象CIDRを除去して再起動する。配列全体を上書きせず、既存値を退避・保持したうえで対象entryだけを追加・削除する。

## 独立反証（2026-07-14）

`gpt-connector`（`gpt-5-6-thinking` / `min`）は、通常のLocal Network privilegeがapp単位であることを根拠にCIDR例外案と再起動必須へ異議を出した。Apple一次JSONで反証した結果、通常のapp単位許可と管理端末向けsystem-wide CIDR例外は別契約であり、後者には再起動必須と明記されているため、この二点は棄却した。一方、許可するinterface種別を実経路だけへ絞る指摘は生き残ったため、`en5`（Ethernet）だけへ縮小した。
