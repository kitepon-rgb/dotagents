# smux — ターミナルを共有面にして AI エージェント同士を対話させる

- 出典: @AiAircle34052（Aircle 学生AIコミュニティ）2026-03-29 https://x.com/AiAircle34052/status/2038144179822645459（1116 bookmarks・詳細は動画＋GitHub）
- 取得日: 2026-07-04
- 確度: 中（要旨は本文から明確。GitHub 実物は未評価＝**導入前に検証必須**）
- 関連: dotagents/bin/delegate.sh・docs/MODELS.md・[[ai-collaboration-as-code]]

## 要旨

- **smux**: Claude Code と Codex を**ターミナル上で会話させる**ツール。
  - AIエージェント同士がターミナルで通信。**API 不要・プロトコル不要**。ターミナルが共有インターフェース。
  - **bash を実行できる AI なら何でも参加可能**。
  - 例: Claude Code が設計 → Codex がレビュー → また Claude Code が設計、を全自動連携。
  - GitHub 公開済み。「エージェント間連携の決定打になる可能性」と評される。

## うちへの含意

- うちの現構成は **Fable(統括) → aiterm PTY → `delegate` → codex exec（単発・一方向委譲）**。smux は同じ「ターミナル＝共有面」の発想で、**双方向の対話ループ**（Claude 設計 ⇄ Codex レビュー）に拡張する。
- MODELS.md の「第三者視点レビュー＝Codex review」を、対話ループとして回せる可能性。工場の将来オーケストレーション候補。
- ただし **aiterm PTY で既に「ターミナルを共有面に外部 AI を叩く」は達成済み**。smux 追加の是非は「双方向ループが単発委譲＋統括裁定より本当に優るか」を実測してから（原則7: 外部依存は上位互換が確認できた時だけ）。

## 評価タスク（P6 候補・未着手）

1. smux の GitHub 実物を取得（README を markitdown 化して rag/ 追記）。
2. 小さな実タスクで「Claude 設計→Codex レビュー→再設計」ループを1回実走、delegate 単発＋統括裁定と品質・コストを比較。
3. 優れば MODELS.md に対話連携として正式収録、劣れば本 rag に「不採用の根拠」を残す。
