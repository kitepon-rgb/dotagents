# Grok Build Community overlay（工場所有の差分面）

更新日: 2026-08-17。正本はdotagents。これは自作コア12製品目でも基盤toolchainの新IDでもない。公式 `grok` CLI（product `grok-build`）はそのまま black-box 管理する。本面は、Mac の自前 Desktop と main-server の自前 AFK Pilot だけを工場が追従する。

## 所有

| 面 | 作業ディレクトリ | origin | upstream |
|---|---|---|---|
| Desktop overlay | `~/Developer/grok-build-vscode` | `kitepon/grok-build-desktop-kitepon`（private） | `phuryn/grok-build-vscode` |
| AFK overlay | `~/Developer/afkpilot` | `kitepon/afkpilot-kitepon`（private） | `phuryn/afkpilot` |
| 公開ホスト | main-server `~/afkpilot/deploy/kitepon` | — | — |

公開面は `https://afk.kitepon.dev`。Access は `kitepon@gmail.com`、セッション 720h。Desktop の API/uplink だけ Bypass。Caddy は `192.168.1.2:18870`。公式 `Grok Build Desktop.app` は残し、運用は `Grok Build Desktop (kitepon).app`。

禁止: 上流 `phuryn/*` への push。公式 dmg の上書き。コア11＋toolchain 3 の product ID 追加。第三者本体への無関係 patch。

## 更新

入口は `bin/update-grok-community-overlay.sh`（dirty なら停止、`upstream/main` へ rebase、focused test。`--push` で origin へ `--force-with-lease`）。ビルドと本番 compose は別手。詳細は grok-build-community-overlay runbook。

Desktop のレール「Update available」は上流 `phuryn/grok-build-vscode` の新 tag 合図であり、公式バイナリを入れない。サーバー側の自己更新通知は無い。

## 差分の置き場

Desktop: 既定リレー `wss://afk.kitepon.dev`、パッケージ済みでも `GROK_RELAY_URL` / `~/.grok/afk-relay.json`、公式 updater 遮断、appId/profile 分離、空 cwd の回復。リモートの PROJECTS `＋` は `$HOME` 配下のフォルダ一覧（ホーム自体は追加不可）。外す操作はデスクだけ。

AFK: `RELAY_DEVICE_STORE` のファイル永続、`deploy/kitepon/`。`web/vendor` は手で持たず、必要なら上流手順の `npm run sync-ui`。
