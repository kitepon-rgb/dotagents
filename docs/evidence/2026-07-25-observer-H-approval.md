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

