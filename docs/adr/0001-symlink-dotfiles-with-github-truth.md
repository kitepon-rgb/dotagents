# ADR 0001: symlink 配布の dotfiles ＋ GitHub を真実の源とする

日付: 2026-07-04（追認記録。決定自体は初期コミット 79c1bb7 時点）

## Context

Claude Code / Codex の自作 skill・command・rule・グローバル CLAUDE.md・罠DB（caveat own）を複数端末で同期したい。端末ごとのコピー配布は必ず drift する。

## Decision

- リポジトリ内の実体を `install.sh` が `~/.claude/...`・`~/.codex/...`・`~/.local/bin` へ**ファイル/ディレクトリ単位の symlink** で配置する（コピーしない）。
- **GitHub（origin/main）を真実の源**とする: 作業前に fetch→照合、作業後は push で真実を返す。
- 端末固有物（settings.json・sessions・学習 skill 等）はリポに含めない（CLAUDE.md「含めないもの」）。

## Consequences

- どちら側から編集しても同一ファイル＝編集は即時反映、同期は `git pull` だけ。
- 実ファイルが既に在る宛先は install.sh が SKIP する＝**退避しないと正本化が静かに不成立**（verify-install.sh で検出）。
- 複数端末の同時編集は git の衝突として顕在化する（暗黙の上書きより安全）。
