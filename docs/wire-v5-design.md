# wire v5 設計正本 — AIShellの固定集合編入

**状態:** Active（[AIShell編入計画](plan_aishell-factory-integration.md) Phase A5-P0の成果物）
**工程正本:** Lattice plan `aishell-factory-integration`
**対象:** dotagents reporter、ServerManager / BugHub ingest、4 active host

本書はwire v5の**契約**を所有する。工程状態・完了証拠はLattice storeが、
実装手順は各repoのコードと[reporter runbook](factory-reporter-runbook.md)が持つ。

## 1. なぜ新しいwire majorが要るのか

AIShellをBugHubの観測面へ載せる方法は、着手時点では2つあると考えていた。

- **A案**: 新しいwire majorを切り、固定集合へ`aishell`を加える
- **B案**: majorを切らず、server側のexpectation matrixだけで`aishell`をmac=requiredへ昇格させる

**B案はschemaが塞いでいる**。2026-07-25の実測:

| 面 | 実測 |
|---|---|
| BugHub v2 schema | 14キー定義／12必須。`lattice`・`aishell`をoptional keyとして受理する |
| BugHub v4 schema | 12キー定義、`additionalProperties: false`。`aishell`のスロットが**無い** |
| dotagents client | `lib/factory/contract.mjs`の`exactKeys(report.products, V4_PRODUCT_IDS)`が13個目のキーを拒否する |

つまり現役wire v4では、`aishell`を送ろうとしても**client / server両端で拒否される**。
「optionalだから報告が無いだけ」ではなく、構造的に席が無い。

A3で入れたserver-first optional登録はv2 schemaにだけ存在し、v4 cutoverの時点で
観測面から消えていた。**編入中製品のoptional key登録はwire majorを越えて継承されない**——
これが本waveで最も高くついた発見であり、[還流対象の罠](evidence/wire-v5/)である。

したがって**A案が唯一の経路**であり、B案は棄却する。

## 2. 固定13製品集合

```
caveat, throughline, spotter, lattice, markitdown, gpt-connector,
aiterm-mcp, codex-sidecar, servermanager, claude-code, codex-cli, grok-build,
aishell
```

v4の固定12製品を**順序も含めてそのまま保持**し、`aishell`を1つ加えた集合とする。
`report_mode="full"`、`schema_version="5.0"`、endpoint `POST /api/factory/v5/reports`。

### 不変条件

- **v5はv4の意味を差し替えない**。v4 endpoint、v4 schema、v4の受入証拠は一切変更しない。
  v5は追加であって改訂ではない。
- v2 / v4のproduct set、schema、凍結済み受入証拠を後付けで書き換えない。
- 製品IDの綴りは既存のまま使う（`gpt-connector`、`aiterm-mcp`、`codex-sidecar`、
  `claude-code`、`codex-cli`、`grok-build`）。v5で改名しない。
- `aishell`のsafe_context allowlistは空から始める。必要keyは契約testと同時に個別追加する。

### v3番号の扱い

`v3`はObserver編入（固定13製品）のために予約された番号だが、**client / serverどちらにも
実装が存在しない**（2026-07-25実測: `lib/factory/`・`bin/`・`bughub/`のいずれにもv3は0件）。
v4がv3を飛び越えて着地している。

v5はこの空き番号を再利用**しない**。Observerが将来編入される時は、その時点の現役majorの
次番号を取る。v3はObserver予約の未実装番号として温存し、v5でObserverを扱わない。
