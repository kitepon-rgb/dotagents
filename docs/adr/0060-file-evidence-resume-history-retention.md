# 0060 — file型evidenceのresume履歴保持をdecision型と対称化する

- Status: Accepted / Immutable
- Date: 2026-07-17
- 対象: `lib/orchestrate/control-record.mjs` evidenceRetention／resumeCheck、
  `shared/orchestrate/control-record.md` retention契約
- 反証: `fable`×high refuter 1回（中核生存・「1条件のみ」は棄却→本ADRで契約変更として閉じる）

## Context

`type:"file"` のevidenceはgit履歴照合（同一path・regular blob・exact SHA-256・
`--max-count=256 --all`・bounded読取）の対象外で、参照先の生きた文書を1回編集しただけで
`digest-mismatch`→resume-check `blocked` になった。実測で4 Control全部がblocked。同一manifest内に
同一ref・同一digestが`file`と`decision`の両型で登録され、decision側だけ救済される結果の割れを確認した
（caveat `control-record-file-evidence-1-blocked-decision`）。生きた文書をevidenceに使う設計と
「編集1回で恒久blocked」は両立しない。

## Decision

1. **resume-checkのevidence retentionにおいて、file型もdecision型と同じ履歴救済の対象にする。**
   救済条件は不変: 同一path・regular blob・完全一致SHA-256・最大256 commit・到達可能refのみ・
   別path探索なし・64 MiB共有budget内。履歴に無いdigest（未commitのdirty状態で観測した証拠）と
   深履歴超過は従来どおりfail closed。
2. **file型のmissing由来救済はreview信号を出す**: path消失だが履歴にbytes実在（archive退避等）は
   `evidence-retained-history-missing`として`review-required`へ列挙し、無音でreadyにしない。
   digest-mismatch由来の救済（fileは現存・内容だけ更新）はworkspace drift検査
   （head-changed／dirty-state-changed／workspace-content-changed）が別チャンネルで既に
   review信号を出すため、evidence側の追加信号は出さない。
3. **finalization／archive側のfile型厳格判定は変更しない**（`verifyFinalizationRetention`）。
   不変Decision `docs/elastic-orchestrator-archive-decision-history.md`（2026-07-15、
   「type=fileは履歴保持へ広げない」）は上書きせず尊重する。resume側（再開助言）とarchive側
   （閉鎖時の保全証明）の非対称は意図であり、archive側を変えるかは親計画の予約裁定
   「archive退避とevidence解決の正典衝突は別途設計裁定」でだけ決める。
4. 強制ゲート（accept時のworkspace再fingerprint、finalize時のverifyEvidenceDocuments、
   archive時のverifyFinalizationRetention）は本Decisionで一切緩めない。緩むのは
   resume-checkの再開助言だけである。

## Consequences

- 生きた文書（plan・決定表等）をfile evidenceに持つControlが、文書の正当な更新で恒久blockedに
  ならなくなる。捏造digest・未commit観測・256 commit超はblockedのまま。
- 既存契約テスト（未commit file evidenceのmismatch/missing/unsafe→blocked）は無修正で契約として
  存続する——救済はcommit済みbytesにしか作用しない。
- budget消費は履歴走査分だけ増える。超過は`unsafe`→`blocked`のfail closed（明文化済み）。
