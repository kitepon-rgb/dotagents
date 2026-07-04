---
id: npm-installed-browse-cli-shadowed-by-usr-bin-browse-xdg-open-on-ubuntu-debian-wsl2
title: npm-installed `browse` CLI shadowed by /usr/bin/browse (xdg-open) on Ubuntu/Debian WSL2
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - wsl2
  - ubuntu
  - debian
  - xdg-utils
  - xdg-open
  - npm-global
  - PATH-shadowing
  - browse
  - browserbase
environment:
  os: linux
  arch: x64
  node: 22.22.1
source_project: null
source_session: 2026-05-17T19:12:50.749Z/9e73d628301d
created_at: 2026-05-17
updated_at: 2026-05-17
last_verified: 2026-05-17
---

## Symptom

Pipelines that invoke the `browse` command (Browserbase unified CLI installed via `npm install -g browse`) fail on Ubuntu/Debian-based WSL2 with errors like `xdg-open: unexpected argument '9222'` (or other random arg the script passed). `npm install -g browse` reports success, but `which browse` returns `/usr/bin/browse` which is a symlink to `/usr/bin/xdg-open`. Any child process that does a `PATH` lookup for `browse` hits xdg-open first when the user's `PATH` has `/usr/bin` before `~/.npm-global/bin` (the common default on fresh Ubuntu WSL2 installs).</symptom>
<parameter name="cause">Ubuntu/Debian's `xdg-utils` package ships `/usr/bin/browse` as a convenience symlink to `xdg-open` (so a user can type `browse foo.html` to open a file). When you then `npm install -g browse` from the public npm registry to get the unrelated Browserbase CLI (`browse/0.6.x`, providing `browse open`, `browse network on/off/path`, `browse cdp`, `browse daemon`, etc.), the new binary lands in the npm global bin (`~/.npm-global/bin/browse` for a user-prefix install) but cannot win PATH resolution because `/usr/bin` precedes it. Same-name collision; both binaries exist, the wrong one is invoked.</cause>
<parameter name="resolution">Three workable fixes, in order of surgical-ness:

1. Resolve the npm-installed browse explicitly from your tooling rather than relying on PATH. In Node, call `spawnSync('npm', ['config', 'get', 'prefix'])` once at startup and use `<prefix>/bin/browse` (with `fs.existsSync` guard) as the absolute path. Allow override with an env var like `BROWSE_BIN=/abs/path`.

2. For child processes you spawn that themselves call plain `browse` (and that you don't own), inject `<prefix>/bin` to the front of `PATH` in the child's env: `{ ...process.env, PATH: `${dir}:${process.env.PATH}` }`. This rescues third-party scripts without editing them.

3. Reorder the user's shell `PATH` so `~/.npm-global/bin` precedes `/usr/bin`. Most portable but touches dotfiles and affects every other tool that has the same shadowing issue.

Do NOT delete `/usr/bin/browse` — it's owned by the `xdg-utils` package and apt may restore it on upgrades.

Verify with `type -a browse` (lists every PATH hit in order), `readlink -f /usr/bin/browse` (confirms it's xdg-open), and `~/.npm-global/bin/browse --version` (should print `browse/0.6.x wsl-x64 node-vX.Y.Z`).</resolution>
<parameter name="evidence">Observed on Ubuntu under WSL2 (kernel 6.6.87.2-microsoft-standard-WSL2, Node v22.22.1, npm prefix `~/.npm-global`). After `npm install -g browse`, `which browse` resolves to `/usr/bin/browse` -> `xdg-open`, and `type -a browse` lists `/usr/bin/browse` first, `~/.npm-global/bin/browse` second. Running an automation that called `browse cdp 9222 --domain Network ...` produced `xdg-open: unexpected argument '9222'` and exited 1, even though the npm package was correctly installed. Fix verified by switching to absolute-path invocation and PATH-prepending for child processes: same automation then ran cleanly through to completion.</evidence>
<parameter name="environment">{"os": "Ubuntu (under WSL2 on Windows 11)", "kernel": "6.6.87.2-microsoft-standard-WSL2", "shell": "bash (interactive)", "node": "v22.22.1", "npm_prefix": "~/.npm-global (user-scope)", "package_collision": "xdg-utils:/usr/bin/browse (symlink to xdg-open) vs npm:browse"}

## Cause



## Resolution



## Evidence


