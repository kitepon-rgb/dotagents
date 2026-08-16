# grok-build-community-overlay runbook

工場が所有する Grok Build Community overlay の更新手順。契約の正本は [docs/factory-grok-build-community-overlay.md](../../docs/factory-grok-build-community-overlay.md)。

## いつ使う

上流 `phuryn/grok-build-vscode` または `phuryn/afkpilot` が動いたとき。Desktop レールの Update available は前者の合図。後者は GitHub を自分で見る。

## 手順

1. 両作業ディレクトリが dirty でないことを確認する。
2. `bin/update-grok-community-overlay.sh` を実行する。衝突したら overlay コミットだけ直して続行する。
3. 問題なければ `--push`。
4. Desktop: `~/Developer/grok-build-vscode` で `npm run compile` と `npx electron-builder --mac dir --arm64 --publish never`。できた app を `/Applications/Grok Build Desktop (kitepon).app` へ。公式 app は触らない。
5. AFK を上げるなら source を main-server `~/afkpilot` へ rsync（`--delete` の前は dry-run）し、`deploy/kitepon` で `docker compose up -d --build`。`.env` の `DEVICE_KEYS_PEPPER` を回さない。
6. LAN `http://192.168.1.2:18870/api/health` が 200、公開トップが Access のまま、kitepon Desktop のリンクが残ることを見る。

## やってはいけないこと

`phuryn/*` へ push しない。公式 Desktop を上書きしない。core 製品 ID や wire 集合へ足さない。
