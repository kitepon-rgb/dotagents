# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## このリポジトリの役割

Claude Code と Codex の自作 skill / slash command / rule を複数端末で同期する個人 dotfiles。
コードは無く、`install.sh` がリポジトリ内エントリを `~/.claude/{skills,commands}` と
`~/.codex/{skills,rules}` 配下に **ファイル / ディレクトリ単位の symlink** で配置する。

そのため:

- リポジトリ内のファイルを編集すれば即 `~/.claude/...` / `~/.codex/...` に反映される (symlink なので同じファイル)。逆方向も同じ。
- `install.sh` は冪等。既存 symlink は上書き、実ファイルが存在する宛先は `SKIP` してログを出す。

## 配置規約

| 種類 | リポジトリ上の場所 | 配置先 | 形式 |
|---|---|---|---|
| Claude skill | `claude/skills/<name>/` | `~/.claude/skills/<name>` | `SKILL.md` 必須のディレクトリ |
| Claude command | `claude/commands/<name>.md` | `~/.claude/commands/<name>.md` | 単一 `.md` |
| Codex skill | `codex/skills/<name>/` | `~/.codex/skills/<name>` | `SKILL.md` を含むディレクトリ (`agents/openai.yaml` 等を併設可) |
| Codex rule | `codex/rules/<file>` | `~/.codex/rules/<file>` | 任意ファイル (例: `default.rules`) |
| 実行スクリプト | `bin/<name>.sh` | `~/.local/bin/<name>` | 単一 bash (`.sh` は配置時に外れる、`chmod +x` 必須) |

`install.sh` は上記 5 グループのそれぞれを 1 階層だけ走査し symlink を張る。**新規エントリ追加後は `./install.sh` を再実行が必要** (既存エントリの編集だけなら不要)。

### Skill の frontmatter (Anthropic 規約)

`SKILL.md` の冒頭には YAML frontmatter で `name` と `description` を書く。`description` は **Claude がいつこの skill を起動するかの判定材料**になるため、「〜と頼まれた時に使う」「Use when …」のような起動条件として書く。例:

```yaml
---
name: audit-gauntlet
description: 計画書・仕様書・設計書を 3 段関門で磨き込む。「磨いて」「叩いて」と頼まれた時に使う。
---
```

### Command の frontmatter

`description` 必須、`argument-hint` は任意。`$ARGUMENTS` でコマンド引数を本文に差し込める (`claude/commands/sc-detail.md` 参照)。

### Command を Skill の薄いラッパとして提供するパターン

スラッシュコマンド本文と skill 本文が完全に同じになるなら、コマンド側を skill の `SKILL.md` への相対 symlink にして二重管理を避ける。実例:

```
claude/commands/audit-gauntlet.md -> ../skills/audit-gauntlet/SKILL.md
```

## 含めないもの (リポジトリに置かない)

- `~/.claude/skills/learned/` — 自動学習で増減するため端末ローカル
- `~/.claude/{settings.json,plugins,projects,sessions}` — 端末固有 / 認証情報
- `~/.codex/{config.toml,auth.json,sessions,*.sqlite}` — 同上
- `~/.codex/skills/.system/` — Codex CLI バンドルのシステム skill
- `~/.codex/AGENTS.md` — グローバル指示 (端末別管理の選択肢を残す)

## セットアップ / 同期

```bash
git clone git@github.com:kitepon-rgb/dotagents.git ~/projects/dotagents
cd ~/projects/dotagents
./install.sh
```

編集後は普通に `git add -p && git commit && git push`。他端末では `git pull` のみで反映される (既存 symlink を踏むため `install.sh` 再実行は不要)。

## ビルド / テスト

無し。挙動の検証は実際に Claude Code / Codex で対象スキル・コマンドを起動して確認する。`install.sh` 自身の確認をしたい場合は `bash -n install.sh` で構文チェックのみ可能。

## 自動アップデート

`bin/agents-update.sh` が curated な NPM ツール群 (Claude Code / Codex CLI / 自前ツール 6 個) を `npm install -g <pkg>@latest` で順次更新する。`install.sh` で `~/.local/bin/agents-update` に symlink される。週 1 cron 推奨。詳細手順は `README.md` 参照。**対象パッケージ一覧はスクリプト先頭の `PACKAGES=` を直接編集**。`npm link` 中の package をリストに残したまま走らせると registry 版で上書きされる点だけ注意。
