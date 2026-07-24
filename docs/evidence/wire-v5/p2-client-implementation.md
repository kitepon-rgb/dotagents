# P2受入証拠 — dotagents reporter v5実装（非本番）

- 日付: 2026-07-25
- 所有repo: dotagents

## 実装

| ToDo | 内容 |
|---|---|
| wv5-0210 | `lib/factory/v5.mjs`（固定13製品、`contract_version` / `schema_version` 5.0、reporter 5.0.0）と`contract.mjs`の`V5_PRODUCT_IDS` / `validateReportV5`。v5はv4と同じ`validateReportVersion`を共有し、client privacy gateをserverより弱くしない |
| wv5-0220 | `aishellProduct`をv5 scanへ配線。`host.profile`を渡し、非対応profileでは構造的な`not_applicable`を返す |
| wv5-0230 | `bin/factory-scan-v5.mjs`、`bin/factory-reporter-v5.mjs`、`bin/factory-reporter-v5-schedule-runner.mjs` |
| wv5-0240 | `factory-reporter-scheduler`へ`--wire-major v5` |
| wv5-0250 | privacy negativeを含むclient test 7本 |
| wv5-0260 | `make ci`と`verify-install` |

## 不変条件の確認

- **v2 / v4の固定集合とvalidatorは変更していない**。`V2_PRODUCT_IDS` / `V4_PRODUCT_IDS` /
  `validateReportV2` / `validateReportV4`はそのまま。testで「v4 validatorはv5の13製品を拒否し、
  v4の受理は非回帰」を明示的に固定した。
- **v5専用のstate namespaceとoutbox**: state `~/.local/state/dotagents/factory-reporter-v5`、
  envelope `dotagents.factory-outbox.v5`、endpoint `/api/factory/v5/reports`。
  testで「v4のoutboxを列挙しない」ことを固定した。
- **runtime error acknowledgementのpayload契約はv4と同一**のため実装を共有する。
  名前だけv5へ変えて中身を複製することはしていない。

## scheduler実測

```
install --wire-major v5 --dry-run --platform darwin --config <v5 config>
  → ok: True | wire_major: v5 | state: .../factory-reporter-v5

install --wire-major v4 --dry-run --platform darwin --config <現行config>
  → v4 ok: True | state: .../factory-reporter-v4
```

v4登録は無傷。また、v4 endpointを指したconfigで`--wire-major v5`を指定すると
`reporting.endpointは/api/factory/v5/reportsでなければなりません`で停止する。
**cutover時にendpointとschedulerがずれることを機械的に防ぐ。**

## gate

| gate | 結果 |
|---|---|
| `node --test tests/wire-v5/wire-v5.test.mjs` | **7/7 pass** |
| `make ci` | 別掲（下記） |

## test作成中に自分で捕まえた誤り

「暗黙fallbackを足さない」を`doesNotMatch(/osascript|AppleScript/)`で書いたところ、
**自分がソースへ書いた「AppleScriptへfallbackしない」というコメント自体に一致して赤になった**。
言及ではなく実際の起動（`run('osascript'` 等）を見る形へ直した。
コメントでtestを緑にする書き方を残さない。
