# ADR 0002: docs/ のファイル名は連番化しない（生きた参照）

日付: 2026-07-04

## Context

PROJECT_LAYOUT 標準は docs/ の 00_ 連番正典を要求し、対象18リポには適用した。dotagents 自身にも適用するかが論点。

## Decision

dotagents の `docs/TODO.md`・`PENDING_OWNER.md`・`OTHER_TERMINAL_KICKOFF.md` 等は**リネームしない**。代わりに `docs/00_overview.md`（地図）を追加して入口だけ標準に合わせる。

## 理由

これらのファイル名は、全端末で走行中の作業指示・コピペ文・グローバル CLAUDE.md・端末メモリから**名前で**参照される。リネームは全端末の参照を同時に壊す＝PROJECT_LAYOUT の見送り基準「破壊的リスクが益を上回る」に該当する。

## Consequences

- dotagents は「00_overview.md＋既存名」のハイブリッド。新規の正典級文書を足す時は連番を検討してよいが、既存名の変更はオーナー宣言＋全端末同時更新が条件。
