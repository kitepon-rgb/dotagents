# cf-0164 Codex全対応 最終報告

- 実施日: 2026-07-21
- 対象: `codex-full-support/cf-0164`
- 結論: Codex全対応の実装・5入口E2E・4 host配布・公開CI・計画archiveを完了した。

## 項目別報告

| 項目 | 判定 | 実施内容 / スキップ理由 |
|---|---|---|
| 現役5入口E2E | 実施 | Mac CLI、Mac App、main-server CLI、main-server App Remote、FOX Windows nativeを受け入れ |
| Windows SessionStart | 実施 | Spotter timeoutを30秒へ正規化し、dotagents hook JSONをASCII安全化 |
| Spotter公開 | 実施 | `claude-spotter@1.4.28`をpublish、Spotter CI 6 matrix green、release `v1.4.28` |
| dotagents最終ゲート | 実施 | focused test、`make ci`、official `verify-install`、GitHub CIをgreen化 |
| 4 host同期 | 実施 | Mac、main-server、FOX WSL2、FOX Windows nativeを同一code-bearing SHAへ収束 |
| 計画archive | 実施 | `docs/plan_codex-full-support.md`を`docs/archive/`へ移し、live参照をLattice正本へ更新 |
| Lattice本体修理 | スキップ | オーナー指示どおり製品repoを変更せず、不具合はdotagents `cf-0285`へblocked登録 |
| `codex-rc` | スキップ | 廃止済みのため全工程で不使用 |
| `docs/evidence/fixtures/` | スキップ | ユーザー所有の未追跡資産。未読・未変更・未stage |

## 主な変更ファイル

### Spotter

- `src/cli/codex-hook-cmd.mjs`
- `test/codex-hook-cmd.test.mjs`
- `package.json` / `package-lock.json`
- `CHANGELOG.md` / `CLAUDE.md`
- `docs/02_spotter-claude-contract.md` / `docs/open-issues.md`

Spotter commitは`c137c3e`、releaseは`v1.4.28`。

### dotagents

- `lib/lattice-hook.py`
- `tests/hooks/codex-smoke.sh`
- `bin/lattice-todo-inventory.mjs`
- `README.md`
- `docs/plan_factory-master.md`
- `docs/r2-e2e-checklist.md`
- `docs/archive/plan_codex-full-support.md`
- `docs/evidence/2026-07-21-cf0146-five-entry-e2e-progress.md`
- `docs/evidence/2026-07-21-cf0163-final-gates.md`
- `docs/evidence/2026-07-21-cf0165-plan-archive.md`
- `docs/evidence/2026-07-21-cf0166-push-and-host-sync.md`
- `docs/evidence/2026-07-21-cf0029-final-refutation.md`
- 対応するLattice evidence descriptorと`.lattice/todo/`の工程履歴

## 端末別検証

| host / entry | 検証結果 |
|---|---|
| Mac Codex CLI | 新規session、hook、skill/routing、Throughline/Spotter文脈を受入 |
| Mac Codex App | 新規taskと複数turnを受入 |
| main-server CLI | 新規session、hook実火、Throughline handoffを受入 |
| main-server App Remote | 複数turn、hook配送、Throughline current thread、Spotter文脈を受入 |
| FOX Windows native | SessionStart完了、timeout/invalid JSON再発なし、Spotter 1.4.28を受入 |
| FOX WSL2 | hook復旧、official install/verify green |

配布検証は4 hostすべてofficial profileでgreen。code-bearing SHA
`b1293e29bbc0f1b941daa1ae5f381b035b53763b`のGitHub CI run `29789517512`、
証拠・工程状態を含むSHA`27a8dfcc93204f3a819987a42c5d08f81e92cd2d`のrun `29789861379`はいずれもsuccess。

## 残件

製品実装・配布・受入の残件はない。Lattice製品不具合`cf-0285`だけを、オーナー指示どおり
dotagents ToDoのblocked記録として残す。
