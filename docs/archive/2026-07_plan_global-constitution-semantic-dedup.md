# グローバル憲法の意味重複解消

更新: 2026-07-16

## 目的

`claude/CLAUDE.delta.md`と`codex/AGENTS.delta.md`を意味単位で再分類し、hostに依存しない判断原則・安全契約・委譲契約・回収契約を`shared/constitution.md`へ一度だけ保持する。各deltaには、そのhostだけに存在する入口、schema、設定名、製品固有の配置規則だけを残す。

## F / A / H

- **F（親直轄）**: 共通規範とhost固有配線の境界、重複統合、最終受入。
- **A（親直実装）**: 共通正本・二つのdelta・生成物・fixtureの更新。並行worktreeの別差分と非交差に保つ。
- **H**: なし。端末設定、credential、commit、push、履歴改変は行わない。

## 成功条件

- [x] project側優先、委譲判断、役割ベース配置、外部worker安全契約、timeout回収、利用可能性4段階、相談レーンを共通正本へ統合する。
- [x] Claude deltaをClaude固有shell入口、Claude親からのCodex優先配置、Claude固有executor対応だけに絞る。
- [x] Codex deltaをCodex固有shell入口、native/externalの具体入口、effort、routing schemaだけに絞る。
- [x] 同じ意味の規範を両deltaや共通正本とdeltaへ重複記述しない。
- [x] fixtureが共通契約の所在とhost固有契約の非交差を検証する。
- [x] 生成物を再生成し、focused／related／full gateの実結果を記録する。

## 非目標

- 共通規範の意味を弱めない。
- ClaudeのCodex優先配置、Codexのrouting／effort制約を一般化しない。
- generator、install先、symlink構造、project rootの`AGENTS.md`／`CLAUDE.md`の役割を変更しない。
- 別セッションの`codex/rules/default.rules`や既存コミットを収容しない。

## 既知の罠

- host名やツール名を削るだけでは意味重複は消えない。同一の判断・禁止・受入条件は一つの共通条文へ統合する。
- 共通化でCodex固有schemaやClaude固有のCodex優先配置まで抽象化すると、実行可能な指示が失われる。
- 生成物は直接編集せず、正本とdeltaを更新後にgeneratorで再生成する。

## 検証

- focused: `make test-constitution`、`node bin/render-global-constitution.mjs --check`。
- related: `make lint-constitution`、`make lint-js`、変更Markdownの固定版markdownlint、`make test-install`。
- full: Phase完了時に`make ci`を1回だけ実行し、既存失敗を含めて成功・失敗・未実行範囲を記録する。

## 検証結果（2026-07-16）

- focused: `make test-constitution` 5/5成功・fail 0・skip 0（冪等生成・空delta省略・drift拒否・不正引数拒否・共通／host契約の非交差）。`--write`後の`--check` green。
- related: `make lint-constitution`、`make lint-js`、`make test-install`（隔離HOME）成功。`make lint-md`で今回の変更ファイルは0エラー。
- size: `claude/CLAUDE.md` 13,772 bytes、`codex/AGENTS.md` 13,771 bytes（32 KiB上限内・共通部のみでSources行以外一致）。最終形（オーナー裁定 2026-07-16）: 意味なし削除・PTY既定の全host共通化を経て**両deltaは空（見出しのみ）**、さらに**Elastic統括正典（shared/orchestrate・docs/02）と競合する条文を憲法から全削除**（untrusted input条項はdelegation-contract.mdへ移設保全）。host固有裁定は`docs/02_models.md`決定表と`docs/05_codex-fragments.md`が正典で、generatorは空deltaの固有差分節を省略する。
- full: `make ci`は依頼外・既存の`docs/adr/0043-o3-claude-provider-adapter-boundary.md:60` MD012 1件で`lint-md`停止。lint-sh／lint-py／lint-jsはgreen、停止後のfull suiteは未実行。既存ADRは別セッション所有のため未変更（修正は別タスクへ切り出し済み）。
- 裁定証拠: `docs/adr/0047-global-constitution-semantic-dedup.md`。
