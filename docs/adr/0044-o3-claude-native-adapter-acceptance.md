# ADR 0044: O3 `claude-native` Worker adapter受入

- Status: Accepted
- Date: 2026-07-16
- Parent canon: `docs/plan_factory-master.md`
- Design decision: [ADR 0043](0043-o3-claude-provider-adapter-boundary.md)（本ADRは受入記録であり、0043へ追記しない）
- Control: `observer-factory-20260715` Task `o3-claude-provider-adapter-design`

## Context

Phase O3の最初の独立単位として、既存v25 Worker契約を変更しない`claude-native` execution adapterの
純粋request／observation／failure projectionを実装した。実model request、login、credential操作、
network dispatchは行っていない。

## 受入対象

| 種別 | commit | 内容 |
|---|---|---|
| source/test | `4a3c9a7` | `claude-native` adapter catalog登録、start/resume request、observation／timeout projection、failure matrix、Control `claude-native.session.v1`のUUID厳格化、focused test |
| source/test | `1573fce` | 受入監査で検出したadapter/Control間のUUID大文字許容非対称をfail-closed方向へ統一 |
| design docs | `2a27444` | ADR 0043（設計Decision・独立commit） |

## 親監査の結果

- `4a3c9a7`実diffを親自身で読み、ADR 0043の全Decisionとの一致を確認した:
  同一caller UUIDのstart（`--session-id`）／resume（`--resume`）、隔離workspace・明示model／effort／
  tool policy必須、`--continue`／`--fallback-model`／`--bare`／`--safe-mode`／`--no-session-persistence`
  非生成、caller timeout=`unknown`（`raw_status="caller_timeout"`）、completed projection単独の成功確定を
  `WORKER_REPORT_IMPORT_REQUIRED`で拒否、`claude-internal`はprojection専用のまま。
- 生成argvをClaude Code 2.1.211の実CLI helpと照合した。使用flag（`--print`／`--verbose`／
  `--output-format`／`--input-format`／`--session-id`／`--resume`／`--model`／`--effort`／
  `--permission-mode`（`dontAsk`は有効choice）／`--tools`／`--allowedTools`（両者ともカンマ区切り可）／
  `--disable-slash-commands`／`--no-chrome`）は全て実在する。
- `claudeHandle`厳格化は`claude-native.session.v1`専用で、legacy `claude.session.v1`（registry非掲載）へ
  波及しない。
- 監査検出1件（adapter側regexの`/i`による大文字UUID許容）は`1573fce`で修理し、focused testで固定した。

## Gate（実測）

- related gate（`tests/orchestrate/executor-adapters.test.mjs`＋`executor-contracts.test.mjs`＋
  `control-record.test.mjs`）: **117/117、fail 0、skip 0**（O3開始baseline 115/115に本単位のtest追加分を
  含む。1573fce適用後に一回実行）。
- lint（`make lint-js`＝`node --check`全mjs）: green。
- full regressionはPhase O3完了時のPhase gateへ集約し、本単位では実行しない（親正本の頻度規約どおり）。

## 契約整合（同時受入）

- `shared/orchestrate/executor-adapters.md`: catalog表へ`claude-native@v1`（worker／`headless-session`／
  start・resume）、packet／projection節、failure matrix行を追加。
- `shared/orchestrate/control-record.md`: `claude-native.session.v1`のlowercase UUID・start/resume同一値
  契約を明記。
- `docs/02_models.md`: 入口の既知の事実へ「projection-onlyでexecution-verified未満＝writerへ使わない」を
  1行追加。
- `rag/orchestration/provider-quota-and-claude-runtime.md`: 失効注記を追加（未login結論、background
  Observer候補、`--bare` Consultation方針を後続正典ADR 0032／0033／0043への明示リンクで訂正。原文は
  当時の実測として保持し削除・改竄しない）。`rag/INDEX.md`該当行も同旨へ更新。

## 未実施（本単位の非目標）

- 実model request、login、credential、network dispatch、push、publish、deploy、意図的障害試験。
- Consultation多provider化（別のO3 schema Decision。v25 `slug`へのhandle詰込み禁止、v26予約の非転用を
  含めADR 0043-6のとおり独立gateで裁定する）。
- live dispatchとexecution-verified昇格（後続のH gate）。

## 既知の残存事項

- Control `observer-factory-20260715`のresume-checkは、過去revisionが記録した`docs/02_models.md`と
  `docs/plan_observer-factory-integration.md`のevidence digestがgit履歴に存在しない
  `evidence-digest-mismatch` 2件を報告する。これは前セッションが未commitのworking tree状態を
  evidenceとして記録した過程の欠陥であり、本単位の成果・gateへ影響しない。事後のdigest再構成は
  正典（不変Decision規約）で禁止のため行わず、事実として本ADRへ記録する。
