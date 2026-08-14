# ADR 0129: Grok工場適用の第一波を境界付きで受け入れる

- **状態:** Accepted
- **日付:** 2026-08-14
- **対象:** dotagents、Spotter、Throughline、Aiterm、工場12製品
- **関連:** [GF07最終受入](../../evidence/grok-factory-application/GF07.md)、
  [ADR 0128](0128-grok-hook-release-control-drift-recovery.md)

## Context

Grok 4.6をAitermから使うと、Claude互換HookへGrokのcamelCase envelopeが流入し、
SpotterとThroughlineがエラーを発生させていた。Grokを実装者にせず、親がAitermから
観測した結果、Aiterm本体のrequest、`turn_ended`、wait、answer投影は成立していた。

工場全製品を一括してGrok正式hostへ拡張すると、ClaudeとCodexの既存契約を壊す範囲が
大きい。そこで第一波は、実在したHookエラーの根治と、製品ごとの到達性分類に限定した。

## Decision

1. Spotter 1.5.10とThroughline 0.9.1の修理を受け入れる。Claude互換Hookへ非Claudeの
   camelCase envelopeが流入した場合、payload変換や副作用より前にunsupported no-opとする。
2. この修理をGrokの正式host対応、Grok用Hook capture、host enum追加とは扱わない。
3. AitermのGrok 4.6経路は、request、`turn_ended`、wait、answer投影が成立したため
   `supported`とする。Grok 4.5へfallbackしない。
4. 工場12製品の判定は[GF07最終受入](../../evidence/grok-factory-application/GF07.md)の
   matrixを本waveの受入正本とする。`partial`、`unsupported`、`not_applicable`を
   greenまたは正式Grok対応へ丸めない。
5. AIShellの`CHECKPOINT_WRITE_FAILED`、peertable room MCPのhandshake失敗、
   Composer modelのlive catalog不在は、このwaveでは修理せず観測結果として保持する。
6. SpotterとThroughlineのfocused test、関連regression、fresh Claude managed Stop、
   Codex root `task_complete`、Grok 4.6 `turn_ended`を無退行の受入証拠とする。
7. GF07のLattice終端監査と本ADRをもって第一波のControlを完了する。

## Consequences

- Grok 4.6利用時に既知のSpotter／Throughline Hookエラーは発生せず、ClaudeとCodexの
  既存経路も維持される。
- 全12製品がGrokで完全対応したとは宣言しない。`partial`または`unsupported`の製品を
  対応させる場合は、原因と受入条件を製品単位の別waveで立証する。
- Composerは利用可能なComposer modelがlive catalogへ現れるまでGrok modelで代用しない。

## Rollback

SpotterとThroughlineは各repoの通常release手順で直前versionへ戻せる。ただしrollbackすると
既知のGrok Hookエラーが再発するため、Claude／Codex無退行の失敗が実測された場合だけ行う。
受入分類の変更は証拠を上書きせず、新しい観測とADRで更新する。
