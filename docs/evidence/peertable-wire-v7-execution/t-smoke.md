# t-smoke 公開後smoke — 完了証跡

## 何をしたか・どう確認したか

1. `npm install -g peertable@0.3.6`実行。global installを0.3.5→0.3.6へ更新。
2. `PEERTABLE_URL= peertable-client diagnostics --json`実測:
   ```json
   {"schema":"peertable.native_factory_diagnostics.v1","product":{"name":"peertable","version":"0.3.6"},
    "checks":{"version_consistency":"pass","bin_integrity":"pass","node_runtime":"pass","skill_bundle":"pass",
    "room_reachability":"not_applicable"},"overall":"ready"}
   ```
   `overall: ready`を確認。
3. `bin/factory-scan-v7.mjs`で実v7 report再生成。`peertable.installed_version`が`0.3.6`（更新反映済み）、
   全5 checkが`pass`/`skipped`（room_reachability）、`compatibility_status: compatible`を確認。
4. v6 baselineとの非回帰確認: `bin/factory-scan-v6.mjs`をv6時代のconfig backup
   （`~/.config/dotagents/factory-reporter.json.bak-v6-20260809T210924Z`）で実行し、v7 reportと
   構造比較。
   - v6=14製品、v7=15製品、差分は`peertable`の追加のみ（欠落なし）。
   - v6/v7共通14製品の`presence_status`が全て一致（v7追加によるv6コードパスの回帰なし）。

## 受入条件との対応

- 「`peertable-client diagnostics --json`の`overall: ready`」: 満たした（0.3.6実測）。
- 「wire v7 reporterのdry-runがv6 baselineと非回帰」: 満たした（構造比較で完全一致、
  差分はpeertable追加のみ）。

記録者: tsumugi
