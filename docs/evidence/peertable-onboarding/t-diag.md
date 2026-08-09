# t-diag peertable native diagnostics実装 — 完了証跡（製品側実装の照合）

- 実装はpeertable製品側の円卓改良campaign（2026-08-08、version 0.2.0）で完了し、0.3.5まで公開済み。dotagents側の作業ではなく、製品自身の正規実装として着地した。
- 実装確認（peertable repo・2026-08-10読解）: `room/client.mjs` にargv dispatch（環境変数チェックより先）＋`runDiagnostics()`。決定45の5 check・overall判定・exit code・`--json`/人間可読の両モードを実装。versionハードコード（`MCP_VERSION`）は意図的で、`version_consistency`がpackage.jsonとのdriftを機械検出する設計（peertable docs/plan.md 決定58配下に0.3.0での実被弾と対策の記録）。
- 実測（2026-08-10）: `PEERTABLE_URL= peertable-client diagnostics --json` → schema/checks/overall/exit 0 とも契約一致。npm registry実物 `peertable@0.3.5` を `npm view` で確認。
- 記録者: bell（親）。外部（製品側）で完了した作業の照合記録。
