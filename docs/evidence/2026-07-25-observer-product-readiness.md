# Observer公開製品readiness

- 取得日: 2026-07-25
- 対象: Observer HEAD `016f8bc`
- 出典:
  - `/Users/kite/Developer/Observer/package.json`
  - `/Users/kite/Developer/Observer/src/product-diagnostics.mjs`
  - `/Users/kite/Developer/Observer/src/mcp-server.mjs`
  - `/Users/kite/Developer/Observer/.github/workflows/ci.yml`
  - `npm view observer`
  - `npm view @quolu/observer`
  - `gh repo view kitepon-rgb/Observer`
- 確度: high（local実物、npm registry、GitHub APIの2026-07-25実測）

## 成立済みbaseline

- Observer `1493b35`で`npm test` 412/412、`npm run check`がgreen。
- `observer diagnostics`は`observer.product_diagnostics.v1`、status=`ready`。
- `npm pack --dry-run`は成功し、5 binaryとruntime package filesを生成できる。
- v1 supported platformはmacOSであり、他platformは構造的`unsupported_platform`。

## 公開を塞ぐ不足

- packageは`observer@0.0.0`、`private=true`。
- source remote、tag、registry release、release lineageがない。
- description、license、repository metadata、public README、lockfileがない。
- publish対象が`origin/main`の祖先かつcleanであることを強制するrelease gateがない。
- CIはUbuntuだけで、required platformであるmacOS gateがない。
- `0.0.0`がpackage、product diagnostics、MCP、host identity、preflight、fixture、runbookへ分散している。

## identity衝突確認

- unscoped `observer`は第三者package 0.0.2が所有しているため使用しない。
- `@quolu/observer`はnpm registryに存在しない。
- `kitepon-rgb/Observer`はGitHubに存在しない。

## 推奨裁定

Observer commit `016f8bc`の`docs/adr/0145-public-product-identity-and-release-readiness.md`を
提案正本とし、次をH裁定へ送る。

- public GitHub repo: `kitepon-rgb/Observer`
- npm package: `@quolu/observer`
- initial public version: `0.1.0`
- license: MIT
- distribution package IDとwire product ID `observer`を分離
- Linux + macOS CI、release ancestor/clean gate、隔離install/rollbackを公開前必須化

未承認のため、remote作成、push、tag、publish、global installはまだ行わない。
