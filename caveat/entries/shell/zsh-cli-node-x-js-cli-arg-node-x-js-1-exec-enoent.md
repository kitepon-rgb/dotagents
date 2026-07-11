---
id: zsh-cli-node-x-js-cli-arg-node-x-js-1-exec-enoent
title: zsh は未クオートの変数を単語分割しない — CLI="node x.js"; $CLI arg は「node x.js」を1コマンド名として exec し ENOENT
visibility: public
confidence: confirmed
outcome: resolved
tags:
  - zsh
  - shell
  - word-splitting
  - SH_WORD_SPLIT
  - bash-portability
  - macos
environment:
  os: macOS
  arch: arm64
  node: 26.4.0
  shell: zsh
source_project: null
source_session: 2026-07-11T08:23:21.903Z/94d529b4220b
created_at: 2026-07-11
updated_at: 2026-07-11
last_verified: 2026-07-11
---

## Symptom

スモークスクリプト等で `CLI="node /path/cli.js"` と定義して `$CLI init` のように呼ぶと、zsh では `no such file or directory: node /path/cli.js` になる。bash の癖で「node と引数に分割される」と思い込むと引っかかる。redirect で握りつぶしていると後段の sqlite3 等が「DBが無い」と別の症状で出て原因が見えにくい。

## Cause

zsh は POSIX sh / bash と違い、未クオートのパラメータ展開を既定で単語分割しない（SH_WORD_SPLIT オプションが off）。`$CLI` は空白を含んだまま単一の単語＝コマンド名として解決されるため「node /path/cli.js」というファイル名を探して ENOENT。bash では IFS で分割されるため同じスクリプトが動いてしまい、移植時に露見する。

## Resolution

コマンドを変数に入れて可変長引数で呼ぶ用途では、変数展開でなく shell 関数を使う: `cli() { node /path/cli.js "$@"; }` → `cli init`。どうしても変数なら配列 `cli=(node /path/cli.js); "${cli[@]}" init`、または局所的に `setopt SH_WORD_SPLIT`（非推奨・副作用大）。`sh -c` 委譲でも可。Claude Code の Bash ツールはユーザーの zsh プロファイルで初期化されるためこの挙動になる。

## Evidence

Caveat v0.15 の sync/publish end-to-end スモークで実際に踏んだ（2026-07-11）。`CLI="node .../caveat.js"; $CLI init` が `(eval):41: no such file or directory: node /Users/.../caveat.js`。`cli() { node ... "$@"; }` に変えて全ステップ成功。
