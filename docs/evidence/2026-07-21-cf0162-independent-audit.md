# cf-0162 独立2票＋網羅性Critic監査

## 結論

監査結果は `FAIL`。存在票はPASSだったが、価値票と網羅性Criticで過大完了と最終工程の順序欠陥を確認した。`cf-0029` の最終push・archive受入には進まない。

## 独立票

### existence票: PASS

- 完了71件のうち、authored evidence 32件はtracked path、Git blob OID、SHA-256がすべて一致した。
- imported historical evidence 39件はsource commit、source path、origin lineがすべて実在した。
- 未完項目とblockerの補助証拠もtracked状態で追跡できた。
- `lattice todo verify --plan codex-full-support --json` は `snapshot_stale=false`、`reconciliation_state=reconciled`。

### value票: FAIL

次の過大完了を確認した。

- `cf-0281`: 4 hostのhook trustとrequired MCP OAuth完了を、部分観測から拡張している。
- `cf-0282`: FOX WSL2のadvisory／Lattice hook実火証拠がない。
- `cf-0155`: main-serverの設定検査を「他端末実火」へ拡張している。
- `cf-0024`: Mac ClaudeのSpotter hook ledgerを4 hostへ拡張している。
- `cf-0157`: 端末台帳訂正は妥当だが、上記未完了を前提にした既存plan archive完了証拠は再裁定が必要。

`cf-0283` のStop snapshot cleanup修正と `cf-0284` のSpotter Windows JSON修理は、実装・テスト・公開後smokeの実物まで整合し、再開対象ではない。

### 網羅性Critic: FAIL

- `cf-0092`、`cf-0125`、`cf-0146`、`cf-0149`、`cf-0150` がblockedのままで、計画完了・archive・pushへ進めない。
- 現revisionは `hard_dependencies=[]`、`joins=[]` で、`cf-0163`〜`cf-0166` の順序を構造的に保証していない。
- `cf-0163` をarchive／push前だけで閉じると、最終archive commitのGitHub Actions greenを保証できない。
- `cf-0164` を最終報告とするならpush後でなければならない。
- `docs/plan_codex-full-support.md` の独立Codegraphを現役製品として扱う現在形は、Latticeが完全吸収した現正典と矛盾する。

## 親裁定

1. `cf-0024`、`cf-0155`、`cf-0157`、`cf-0281`、`cf-0282` を再開する。
2. 既存blocker 5件を完了条件のまま維持し、未観測をskip完了にしない。
3. 手動gateを `blocker解消 → cf-0163 local/full gate → cf-0165 archive後lint/status → cf-0166 push・origin同期・post-push GitHub Actions green → cf-0029 → 最終報告` の順で固定する。
4. `cf-0029` は上記証拠が揃うまでblockedを維持する。
5. Lattice製品repoは変更しない。工程定義の依存欠落は本証拠とLattice task状態で追跡し、Lattice本体修理へ広げない。

## 親確認

- `git fetch origin --prune`: 成功。監査時点でHEADはorigin/mainより15 commit ahead、behind 0。
- authored evidence 32/32について、HEAD上のblob OIDとcontent digest一致を再確認した。
- ユーザー所有の `docs/evidence/fixtures/` は未読・未変更・未stage。
- 廃止済み `codex-rc` は不使用。
