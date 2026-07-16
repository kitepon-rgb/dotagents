# グローバル統制の二レーン化

## 目的

通常の小径開発をElastic orchestrationへ流さず、複雑・高リスクな作業では既存Control契約を完全維持する。
工場コア製品の非クリティカル欠陥は発見時に割り込まず、Phase末のmaintenance waveでまとめて修理する。

## 非目標

- Control Record、Executor adapter、schema、CLI、wire、fixtureの挙動を変更しない。
- P0/P1、本番、credential、認可、データ破壊、公開契約、履歴改変の安全ゲートを弱めない。
- 過去のarchive文書を書き換えない。

## 変更契約

- 通常レーン: 単一repo・単一担当・単一責務・可逆・低リスク。docs plan、F/A/H宣言、既定委譲、Control、ADR、独立監査を要求しない。
- 統括レーン: 複数repo／Executor／Phase、長時間resume、H、高リスク、競合workspace。既存Elastic契約を完全適用する。
- 欠陥処理: P0/P1だけ即時修理し、P2/P3は所有repoのPhase maintenance queueへ記録してPhase末に一回処理する。
- セッション: 1スレッド1成果または1 Phaseとし、compaction後に新Phaseを始めない。

## TODO

- [x] 同期、dirty、stash、既存知識、関連規則を確認する。
- [x] 変更前の憲法・hook・Elastic契約gateをgreenにする。
- [x] Claude／Codexの共通聖典を二レーン化し、旧always-on規則を削除する。
- [x] project正典、orchestrate適用境界、skill appendixを整合させる。
- [x] hook payloadと現行参照文書から旧always-on規則を除去する。
- [x] 旧規則の残存、行数純増、Elastic実装差分がないことを監査する。
- [x] related gateとfull `make ci`を各一回実行する。
- [x] 不変ADRを一件作り、本計画を完了してarchiveする。
- [x] 対象pathだけを独立commitし、pushせず報告する。

## 検証

- focused: `make lint-constitution lint-hooks`
- related: `make lint-skills make test-orchestrate`
- full: `make ci`
- 静的監査: 旧文言の残存、Claude／Codex parity、対象聖典の合計行数、Elastic source／schema／CLI／wireのdiffを確認する。

## Baseline

- 2026-07-16: `make lint-constitution lint-hooks` green。
- 2026-07-16: `make test-orchestrate` 116 passed、fail 0、skip 0。

## 親による反証

- 「通常レーンが高リスク作業の抜け道になる」仮説: H、本番、credential、認可、データ、公開契約、履歴、長時間resume、workspace競合を通常条件から明示除外し、途中発生時は一方向昇格としたため棄却。
- 「入口を狭める編集がElastic本体を壊す」仮説: Control最小lifecycle節のSHA-256が変更前後で完全一致し、source、schema、CLI、wire、fixtureにdiffがないため棄却。
- 「P2/P3が忘却される」仮説: Phase queueへの一度記録、full regression／監査前の一括wave、H等のcarry over条件を必須化したため棄却。
- 独立反証は未実施。ユーザーから子委譲の許可がなく、本変更自身が撤回するalways-on委譲を再現しないため、親が上記反対仮説と実diffを照合した。

## 完了gate

- focused: `make lint-constitution lint-hooks` green（Claude 46件、Codex 32件のhook smokeを含む）。
- related: 初回は旧「native既定」文字列を固定したskill smokeが失敗。期待値を二レーン契約へ更新後、`make lint-skills test-orchestrate` green（Elastic 116 passed、fail 0、skip 0）。
- full: 初回はsupersession注記のMarkdown lint 2件で停止。注記形式を修正して`make lint-md` green後、`make ci`を再実行し全gate green（最終Elastic 116 passed、fail 0、skip 0）。
- 静的監査: 主要聖典5文書は変更前422行から421行。Control最小lifecycle節のSHA-256は変更前後で`8a66bcfb29558c85df43af39e7d73d36789aefc6c7d3280096b26733ef0476a4`完全一致。Elastic source/schema/CLI/wire/fixtureにdiffなし。
- Decision: [ADR-0040](../adr/0040-governance-two-lane-phase-maintenance.md)。pushは実施しない。
