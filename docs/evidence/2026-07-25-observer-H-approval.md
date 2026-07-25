# Observer公開・配備H承認

- Date: 2026-07-25
- Decision owner: クオ
- Decision: approved

## 承認された対象

- public GitHub repository: `kitepon-rgb/Observer`
- npm package: `@quolu/observer`
- initial public version: `0.1.0`
- license: MIT
- ServerManager wire v6実装のpushとserver-first配備
- Observerのpublish、global install、公開後smoke
- feature flag有効化とv6 host cutover

## 目的・影響・rollback

- 目的: Observerを自作コア製品として正式編入し、固定14製品の公開契約へ届ける。
- 影響: 新しい公開repo/package/versionを作り、ServerManagerとhost reporterに
  wire v6面を追加する。wire product IDは`observer`。
- rollback:
  - v5 endpointと固定13製品契約を維持する。
  - server側は`FACTORY_V6_INGEST_ENABLED=false`へ戻す。
  - host側はv5 reporterへ戻す。
  - 公開済みversionは履歴改変やunpublishをせず、必要ならdeprecateし、
    global installを旧版へ戻す。

## v6 cutover再承認

- owner statement: `続行 Hは承認する。`
- approved at: `2026-07-25T14:50:42Z`
- operation:
  `{"operation":"observer-wire-v6-cutover","server":"main-server","hosts":["mac-kite","main-server","fox-wsl","windows-workstation"],"feature_flag":"FACTORY_V6_INGEST_ENABLED=true","rollback_verified":true}`
- operation digest:
  `c2d55da4e8344e65954268e402cb305ce859f484c9298475d537193b9f52d112`
