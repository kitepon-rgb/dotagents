# P3受入証拠 — dual-run比較とcutover可否裁定

- 日付: 2026-07-25
- host: mac-kite（darwin / arm64）
- v4 report: `b6904720-ee9d-4bd5-b58e-c16a0ab25c7a`
- v5 report: `4b724c78-ebdc-4aeb-8e28-1d65bd5ba606`

## wv5-0310 — 共通12製品のobservation同値性

同一Macで`factory-scan-v4`と`factory-scan-v5`を連続実行し、v4の12製品を全field比較した。

- v4: `schema_version=4.0`、products 12
- v5: `schema_version=5.0`、products 13（差分keyは`aishell`のみ）
- `contract_version`はmajorごとに変わる仕様（4.0 / 5.0）なので比較対象から除外

**意味的な差分はゼロ**。全field一致しなかったのは`claude-code` / `codex-cli` / `grok-build`の
3製品だが、差はすべて`checks[].first_seen` / `last_seen`の**タイムスタンプだけ**である。

```
v4: 2026-07-24T22:46:33.334Z
v5: 2026-07-24T22:46:38.817Z
```

2つのscanが5.5秒差で走ったことによる時刻差であり、status・reason_code・fingerprint・
version・件数はすべて一致した。**未解決の差分は無い。**

AIShellのv5観測（Mac実測）:

```json
{"presence_status":"installed","installed_version":"0.4.1",
 "state_schema_version":"aishell.runtime_configuration.v2",
 "migration_status":"current","compatibility_status":"compatible",
 "checks":[{"check_id":"native_diagnostics","status":"pass"}]}
```

## wv5-0320 — client検証器とserver検証器の対称性

実v5 reportと3種のnegativeを、dotagents `validateReportV5`とBugHub
`validateFactoryReportV5`の**両方へ通した**。

| ケース | client | server | 一致 |
|---|---|---|---|
| 実v5 report | 受理 | 受理 | ✓ |
| AIShellの許可pathを`safe_context`へ混入 | 拒否 `products.aishell.checks[1].safe_context.working_directoryはallowlist外です` | 拒否 `privacy.key_not_allowlisted` | ✓ |
| 未知product（`observer`） | 拒否 | 拒否 | ✓ |
| `aishell`欠落 | 拒否 | 拒否 | ✓ |

**どちらのvalidation errorにもpath値をechoしない**ことを実測で確認した
（`/Users/kite`が両方のerror payloadに現れない）。

**clientで通りserverで落ちる非対称は存在しない**。clientのprivacy gateをserverより
弱くしないという既存方針が、v5でも保たれている。

## wv5-0330 — 非対応profileの構造的not_applicable

`aishellProduct`を各profileで直接呼び、返り値を実測した。

| profile | presence_status | compatibility_status | check |
|---|---|---|---|
| server | `not_applicable` | `unsupported` | `platform_unsupported` |
| wsl | `not_applicable` | `unsupported` | `platform_unsupported` |
| windows-native | `not_applicable` | `unsupported` | `platform_unsupported` |
| mac | `installed` (0.4.1) | `compatible` | `native_diagnostics` pass |

**測定手段の限界を明記する**: 非対応hostのv5 scanをこのMacから実行することはできない。
`validateReportV5`が`host_profile`と`platform.os`の整合を要求するため、darwin上で
server / wsl / windows-native profileの正当なreportは生成できない。したがって
(a) adapterの構造分岐を直接呼び出しで、(b) server受理を合成reportで検証した。
**実hostでの確認はP5 cutoverの受入項目として残る。**

server profileのv5 report（`aishell=not_applicable`）はBugHub validatorが受理した。
期待値がissueにならないことはP1のtestで固定済み
（「v5の非対応hostはaishell欠落をissueにせず、not_applicableも欠落へ読み替えない」）。

## wv5-0340 — 裁定

**本番deploy（P4）へ進む。**

根拠:

1. 共通12製品に未解決の差分が無い（差はタイムスタンプのみ）
2. client / server検証器の判定と理由が全ケースで一致し、非対称が無い
3. privacy negativeが両端で拒否され、error payloadへ秘密値が漏れない
4. 非対応profileが構造的な`not_applicable`を返し、暗黙fallbackが無い

**持ち越す条件**: 非対応host（main-server / fox-wsl / windows-workstation）の
実scanは本Macから実行できないため、P5 cutoverで1台ずつ実測する。
未実測を実測済みとして扱わない。
