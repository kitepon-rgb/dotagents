---
name: auto-deploy-on-push
description: GitHub push 起点のデプロイを安全に検討し、承認前の本番変更を防ぐ Codex 用ワークフローが必要な時に使う。
---

# Auto Deploy on Push

Claude 正本の適用条件・実装例・変種が必要な時は、[Claude skill](../../../claude/skills/auto-deploy-on-push/SKILL.md) を読む。この入口は製品固有の実行ゲートを定める。

1. まず読み取り専用で、到達性、デプロイ先の git 状態、実行環境、対象リポジトリと既存運用を調査する。秘密値は表示・収集・保存しない。
2. 変更の前に、目的、影響範囲、失敗時の rollback を説明し、H 承認を得る。承認前に鍵生成、`authorized_keys` 変更、Secrets 登録、workflow 書き込み、push、workflow 実行をしてはならない。
3. 承認後も対象範囲を狭く保ち、秘密をログ・文書・commit に含めない。失敗を代替経路で隠さず、原因と必要な次の承認を報告する。
4. 変更後は静的検証と、承認された範囲の安全な確認を行う。実本番操作は明示承認されたものだけ実行する。

完了報告には、実施/スキップ（理由）、変更ファイル、目的・影響・rollback、承認された操作、検証結果を含める。
