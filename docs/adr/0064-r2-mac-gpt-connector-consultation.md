# ADR 0064: R2 Mac gpt-connector代表consultの受入

日付: 2026-07-19

## Status

Accepted。

## Decision

MacのCodex親から `gpt_connector` の代表second opinionをexecution-verifiedとして受け入れる。

- slug: `r2-mac-codex-factory-smoke-20260719`
- model: `gpt-5-6-thinking`
- effort: `standard`
- result: `succeeded` / `finished_successfully` / `endTurn=true`
- attachments: 0
- archived: true
- 同じslugの `sessions` でterminal resultとresolved model / effortを再回収できた。

## Second opinion

1. 静的hook配線greenだけではexecution-verifiedにならず、実プロセス・環境・権限下の未発火を見逃す。
2. Spotter `hook_event` は発火有無だけでなく、内容・相関ID・重複・失敗時挙動まで観測する。
3. Throughline handoffは送信だけでなく、受領・解釈・後続処理完了までE2Eで証明する。

## 境界

- `gpt_connector` の既存登録・既存認証を利用した。MCP追加、login、browser表示、添付、uploadは行っていない。
- timeoutや失敗は発生していない。Oracle/API/prompt再送へのfallbackは行っていない。
- 本Decisionはgpt-connectorの代表consultだけを受け入れ、hooks、Spotter、Throughlineの実火残件を閉じない。
