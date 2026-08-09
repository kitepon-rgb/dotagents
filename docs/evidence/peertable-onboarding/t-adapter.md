# t-adapter dotagents adapter＋wire v7 client実装 — 完了証跡

## 何を作ったか

- `lib/factory/v7.mjs`（新規）: `V7_PRODUCT_IDS`（v6の14製品＋`peertable`＝固定15製品）、
  `peertableProduct`/`projectPeertableFactory`（決定45契約 `peertable.native_factory_diagnostics.v1`
  のprojection）、`scanV7WithAcknowledgements`/`scanV7`。
  - `peertable-client diagnostics --json`を呼び、`checks`（version_consistency / bin_integrity /
    node_runtime / skill_bundle / room_reachability）とexit codeの整合を検証する。
  - `room_reachability`はadapter呼び出し時、親環境の`PEERTABLE_URL`によらず常に空文字へ倒す
    （工場scanの製品健全性判定をLAN room到達性に結合させないための設計。peertable自身のnpm
    publish gateと同じ設計思想、決定45）。
  - `overall: not_ready`は固定fingerprint（`sha256(peertable\0check_id\0reason_code)`）のfailへ
    投影する（v5.mjsの`failure()`と同型。永続state不要）。
  - schema不正・CLI不在・exit code不一致はfail closedで`unverified`へ落とす。
- `lib/factory/contract.mjs`: `V7_PRODUCT_IDS`定義、`SAFE_CONTEXT_ALLOWLIST`へ反映（peertableは
  空allowlist）、`validateReportV7`・`readAndValidateReportV7`を追加。v6以前のvalidatorは無変更。
- `tests/wire-v7/wire-v7.test.mjs`（新規、9 test）。
- `docs/wire-v7-design.md`（新規）: wire-v6-design.mdを踏襲したserver-first・dual-run設計。
  server実装・endpoint有効化・host cutoverはH承認待ちであることを明示。

## どう確認したか

- `node --test tests/wire-v7/wire-v7.test.mjs`: 9 test全green。
  - product ID集合（15製品・順序）、`validateReportV7`の固定集合検証（欠落/未知拒否）、
    v6 validatorの非回帰（peertableキー拒否を維持）
  - `projectPeertableFactory`のfixtureテスト: ready→compatible/pass、not_ready→固定fingerprintの
    fail、overallとexit codeの不一致をfail closedで拒否、未知field/未知check statusを拒否
    （fixtureは2026-08-10実測、peertable 0.3.5で`PEERTABLE_URL= peertable-client diagnostics --json`
    を実行して得た実物JSON）
  - `peertable` safe_contextの空allowlist拒否（privacy fixture）
  - `peertableProduct`の統合テスト（fake CLIをPATH注入）: 親環境の`PEERTABLE_URL`が設定されていても
    adapterは空へ倒すこと（room_reachabilityが`skipped`になることで確認）、CLI不在→`missing`、
    JSON不正→`unverified`（`native_schema_invalid`）
- 非回帰確認: `node --test tests/wire-v5/wire-v5.test.mjs tests/wire-v6/wire-v6.test.mjs
  tests/wire-v7/wire-v7.test.mjs tests/lattice-cutover/wire-v4.test.mjs
  tests/factory-reporter/v2-contract.test.mjs` — 33 test全green（contract.mjsは共有コードのため
  v1〜v6のvalidatorも合わせて確認）。

## スコープ外として実装しなかったもの

- `bin/factory-reporter-v7.mjs`・`bin/factory-scan-v7.mjs`・schedule-runner・scheduler配線
  （wire v6の対応物はv6 waveでは別レイヤーだが存在する。今回のtask記述「lib/factory/v7.mjs・
  contract配線・tests・privacy fixture・docs/wire-v7-design.md」に厳密に一致させ、実配信インフラは
  含めなかった。テストは`scanV7WithAcknowledgements`/`peertableProduct`をlibrary関数として直接
  検証しており、CLIラッパーの欠如はtestカバレッジに影響しない）。reporter/scan CLIが要る場合は
  別task（t-hpkgのH承認後、またはt-adapterの追加スコープ）として卓で判断してほしい。
- host matrix行・製品数表記・契約台帳のpeertable節はt-docs（koharu担当）の範囲。

記録者: tsumugi
