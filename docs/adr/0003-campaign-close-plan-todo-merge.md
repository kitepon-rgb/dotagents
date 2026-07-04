# ADR 0003: キャンペーン文書の archive 化とプラン/TODO 統合

日付: 2026-07-05

## Context

Fable 期環境整備キャンペーン（聖典 v3・P0〜P7）が全3端末（MacBook・FOX Windows native・FOX WSL2）で完遂した。消化文書（TODO・PENDING_OWNER・SYNC_LEDGER・P3_GAP_LEDGER・P4_FLAGS_FOX・OTHER_TERMINAL_KICKOFF）は役目を終えたが docs/ 直下に残り、趣旨・退避対象・TODO の3種が文書群に混在していた。

## Decision

1. **文書は3種に分類して管理する**（趣旨／プラン=TODO 兼務／役目を終えたもの）。役目を終えた文書は **docs/archive/ へ git mv** し、docs/ 直下は生きた文書だけに保つ。
2. **プランは TODO を兼ねる**——v3 の「聖典（方針）と消化管理（TODO）の分離」決定を**差し戻す**。分離の益（diff だけで方針変更か進捗かを判別できる）より、分散のコスト（趣旨・消化・承認待ちが複数文書に散り、完了後も台帳が residual として残り続ける）が実測で上回った。以後プランは対象プロジェクトの docs/ に作り、消化チェックボックスをプラン自身に持つ（グローバル CLAUDE.md「計画文書の作法」に全プロジェクト規範として収録）。
3. **ADR 0002 の部分 supersede**: 0002 の「docs/ のファイル名はリネーム禁止」は「全端末で走行中の作業指示から名前参照される」ことが前提だった。キャンペーン終了によりその参照は失効した＝キャンペーン文書の archive 移動は 0002 に抵触しない。**PLAN.md だけは参照が生き続ける**（他リポ14件の rag/INDEX.md・グローバル CLAUDE.md・MODELS.md が「PLAN.md 原則 N」を名指し）ため、ルートのファイル名と原則1〜10 の番号を維持したまま中身を憲章 v4 へ改稿した。
4. **掃引台帳（SYNC_LEDGER 類）はキャンペーン単位の成果物**: 走らせる時に docs/ へ新規起票し、閉じたら archive へ。常設の生きた台帳は持たない。

## Consequences

- docs/ 直下 = 生きた文書のみ（憲章参照の PROJECT_LAYOUT・MODELS・settings.fragments・進行中プラン・作業キュー・adr/）。歴史は docs/archive/ と git log。
- 端末メモリ等に残る旧パス参照（docs/TODO.md 等）は失効するが、キャンペーン終了により実害なし。archive 内の各文書冒頭ヘッダが現行の正（PLAN.md v4）へ誘導する。
- 将来のキャンペーン級作業は「docs/ にプラン起票（TODO 兼務）→ 消化 → archive へ」の一生を辿る。
