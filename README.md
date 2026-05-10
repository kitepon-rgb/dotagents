# dotagents

Claude Code と Codex の自作スキル・スラッシュコマンドを端末間で同期するための個人 dotfiles リポジトリ。

## 構成

```
dotagents/
├── claude/
│   ├── skills/         → ~/.claude/skills/<name>/SKILL.md
│   └── commands/       → ~/.claude/commands/<name>.md
└── codex/
    ├── skills/         → ~/.codex/skills/<name>/
    └── rules/          → ~/.codex/rules/
```

スキルは `SKILL.md` を含むディレクトリ、コマンドは単一 `.md` ファイル。

## 新しい端末でのセットアップ

```bash
git clone git@github.com:kitepon-rgb/dotagents.git ~/projects/dotagents
cd ~/projects/dotagents
./install.sh
```

`install.sh` は `~/.claude/{skills,commands}` と `~/.codex/{skills,rules}` 配下に
本リポジトリの各エントリを **symlink** で配置する。ファイル単位の symlink なので、
端末ローカルにしか無いスキル (例: `~/.claude/skills/learned/`) は触らない。

## 編集ワークフロー

スキル / コマンドは `~/.claude/...` または `~/.codex/...` 経由でも、リポジトリ内
の実体を直接編集してもよい (symlink なので同じファイル)。編集後はそのまま
`git add -p && git commit && git push` で他端末へ共有。

## 含めないもの

- `~/.claude/skills/learned/` — 自動学習で増減するため端末ローカル
- `~/.claude/{settings.json,plugins,projects,sessions}` — 端末固有の状態 / 認証情報
- `~/.codex/{config.toml,auth.json,sessions,*.sqlite}` — 同上
- `~/.codex/skills/.system/` — Codex CLI バンドルのシステムスキル
- `~/.codex/AGENTS.md` — グローバル指示。意図的に各端末で別管理する場合に追加検討
