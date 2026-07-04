# ADR 0002: docs/ のファイル名は連番化しない（生きた参照）

日付: 2026-07-04
状態: **2026-07-05 に [0003](0003-campaign-close-plan-todo-merge.md) が部分 supersede** — キャンペーン終了で名前参照が失効した消化文書は docs/archive/ へ移動済み。本 ADR の原則（生きた参照はリネームしない）は PLAN.md 等の現役参照に対して引き続き有効。

## Context

PROJECT_LAYOUT 標準は docs/ の 00_ 連番正典を要求し、対象18リポには適用した。dotagents 自身にも適用するかが論点。

## Decision

dotagents の `docs/TODO.md`・`PENDING_OWNER.md`・`OTHER_TERMINAL_KICKOFF.md` 等は**リネームしない**。代わりに `docs/00_overview.md`（地図）を追加して入口だけ標準に合わせる。

## 理由

これらのファイル名は、全端末で走行中の作業指示・コピペ文・グローバル CLAUDE.md・端末メモリから**名前で**参照される。リネームは全端末の参照を同時に壊す＝PROJECT_LAYOUT の見送り基準「破壊的リスクが益を上回る」に該当する。

## Consequences

- dotagents は「00_overview.md＋既存名」のハイブリッド。新規の正典級文書を足す時は連番を検討してよいが、既存名の変更はオーナー宣言＋全端末同時更新が条件。
