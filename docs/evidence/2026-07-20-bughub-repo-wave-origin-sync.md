# BugHub repo別wave・origin同期受入 — 2026-07-20

## Scope

Lattice `bughub-factory-integration/bf-0044` の受入を行った。対象はBugHub工場統合で実際に変更した
各repoが、repo別のcommit／rollback単位を保ち、remoteへpush済みであることの確認だけである。
最終full gate、全端末E2E、canary、rollback drill、plan archiveは後続 `bf-0045` ほかが所有する。

このセッションではLatticeを工程storeとしてだけ利用し、Lattice製品repoの修正、version bump、publishは
行っていない。

## Origin synchronization

`git fetch origin`後、次の8 repoで `HEAD...origin/main = 0/0` を確認した。

| repo | 確認時HEAD | remote同期 | dirtyの扱い |
|---|---|---|---|
| dotagents | `2a994e7` | 0 ahead / 0 behind | 本taskのLattice stateと既存未追跡fixtureだけを保持 |
| Throughline | `1bdd876` | 0 / 0 | clean |
| Spotter | `68f612b` | 0 / 0 | clean |
| ServerManager | `2242768` | 0 / 0 | 既存 `.claude/settings.local.json` を保持 |
| gpt-connector | `9cc7831` | 0 / 0 | 既存 `gpt-connector-0.4.4.tgz` を保持 |
| aiterm-mcp | `e888d07` | 0 / 0 | 既存 `tmp/` を保持 |
| codex-sidecar | `c603538` | 0 / 0 | clean |
| Caveat | `4bdf1f6` | 0 / 0 | clean |

既存dirtyは収容、削除、stash、revertをせず、今回の受入対象から分離した。

## Commit boundary verification

コミットメッセージだけに依存せず、各commit objectのparent数、変更path数、`origin/main`への包含を
機械確認した。下記23件はすべて `parents=1` かつ `origin=yes` だった。

| repo | commits | 主な根拠 |
|---|---|---|
| Throughline | `f928c13`, `15427bf` | factory diagnostics、Windows hook release wave |
| Spotter | `65bccf8`, `68f612b` | Windows Codex実行経路、runtime／hook release wave |
| ServerManager | `74c315b`, `b3ac6da` | Pi5 BugHub bridgeとticker修正 |
| gpt-connector | `fa329f9`, `9cc7831` | browser起動境界、prepack gate |
| aiterm-mcp | `c1a2623`, `ab11eb7`, `42cf4af`, `5c6b79a`, `52264c3` | runtime store、auth、PTY、lock、release記録 |
| codex-sidecar | `493d0cd`, `a55c441`, `736e0fd`, `92a6119` | Windows MCP shim、JSON完全出力、release |
| Caveat | `4bdf1f6` | Windows hook release wave |
| dotagents | `39fba73`, `5f781a8`, `5479a73`, `1497ef8`, `a35e987` | ACL、shim、auditor preset／adapter |

各実装は別repoのhistoryへ混ぜず、単一parent commitとして独立してrevertできる。公開・配布の詳細は
既存の製品receipt、`docs/evidence/2026-07-20-core-runtime-maintenance-release-wave.md`、
`docs/evidence/2026-07-20-gpt-connector-browser-start-release.md`、
`docs/adr/0013`〜`0021`、`docs/adr/0068`を参照する。

## Decision

`bf-0044`の文言どおり、対象repoごとの独立commit／rollback境界と全remoteへのpushを受け入れる。
現在のdirtyや後続acceptanceを本taskへ混ぜず、未完の最終gateは未完のまま維持する。
