# Codex orchestrate 配布整合プラン

## 目的

Claude 側だけにある `orchestrate` 正本を複製せず、Codex の skill discovery・配布・検証対象へ載せ、Codex の着手 hook が要求する skill を全端末で再現可能にする。

## 方針

- 正本は `claude/skills/orchestrate/` のまま維持する。
- `codex/skills/orchestrate` は Claude 正本を指す Git 管理の相対 symlink とし、本文や references を複製しない。
- `install.sh` の既存 Codex skill 走査を利用し、`~/.codex/skills/orchestrate` へ配布する。
- 自動検証と README の資産表・新規セッション確認を Codex の `orchestrate` まで広げる。

## TODO

- [x] routing smoke を検証し、`implementer` へ実装契約を渡す
- [x] `codex/skills/orchestrate` の薄いアダプターを追加する
- [x] `verify-install.sh` で正本参照と Codex 配布を検証できるようにする
- [x] README の同梱資産・Codex 対話確認を更新する
- [x] `install.sh` を再実行し、配布先と参照先を実測する
- [x] `make lint` と `verify-install.sh` を green にする
- [x] 差分を独立反証し、生き残った内容だけ採用する
- [x] 完了後、このプランを `docs/archive/` へ移す

## 合格条件

1. `codex/skills/orchestrate` が `claude/skills/orchestrate` を参照し、正本の複製がない。
2. `~/.codex/skills/orchestrate` が本リポの Codex アダプターを指し、そこから `SKILL.md` と `references/` を読める。
3. `./bin/verify-install.sh` が上記の不整合を検出できる。
4. `make lint` と `./bin/verify-install.sh` が成功する。

## やらないこと

- `orchestrate` 本文の内容変更
- 他の Claude 専用 skill の一括移植
- Codex 本体の skill discovery 実装変更
- Track E や別の未完了計画への追加
