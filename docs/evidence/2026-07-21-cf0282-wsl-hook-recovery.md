# cf-0282 FOX WSL2 hook recovery acceptance

- 実施日: 2026-07-21
- 対象: `codex-full-support/cf-0282`
- host: FOX WSL2 `Ubuntu-26.04`
- Codex session: `019f81c9-41c0-7412-9bfe-8404c673a7d5`

## Decision

停止していたFOX WSL2をWindows jump hostから起動し、`ssh.service`をactiveへ戻した。従来の`localhost:2222` relayはbanner timeoutを継続したため、jump hostから現在のWSL IP `172.28.139.105:2222`へMacの既存鍵で直接接続した。この経路でdotagentsの明示interpreter hook commandと新規Codex CLI sessionを実火し、Windowsアプリ選択ダイアログを発生させず、callout、orchestrate advisory、Lattice工程案内を受け入れた。

## 直接証拠

- Codex: `codex-cli 0.144.6`
- Lattice CLI: `0.8.0`（工程読取だけに使用。本体変更なし）
- `verify-install.sh --profile official`: green
- SessionStart canonical commands:
  - `/usr/bin/env python3 /home/kite/.local/bin/codex-callout-hook session-start`
  - `/bin/sh /home/kite/.local/bin/orchestrate-advisory-hook`
  - `/usr/bin/env python3 /home/kite/.local/bin/codex-lattice-gantt-hook session-start`
- 3 commandの直接実行: `CALLOUT_RC=0`、`ADVISORY_RC=0`、`LATTICE_ADVISORY_RC=0`
- 新規Codex sessionでSessionStartのdocs plan INFOとLattice工程表INFOを表示
- 同sessionのUserPromptSubmitでCaveat INFOと統括レーンINFOを表示し、`CF0146_WSL_E2E_OK`で完了
- AGENTS: 人格「ベル」と日本語必須を実読
- skills: `auto-deploy-on-push`、`gpt-connector`、`oracle`、`orchestrate`、`polish-github`、`run-observer-parent-watch`を観測し、`orchestrate` frontmatterを実読
- hooks: SessionStart 4、UserPromptSubmit 4、Stop 4
- Throughline doctor: hooks enabled/trusted、context refresh ready、new-thread handoff ready、current thread一致
- Spotter: hook events 61、Codex 15、SessionStart 7、UserPromptSubmit 8、Stop 7、parse error 0、runtime error 0
- remote HEAD: `655c91505f2f9114e449a516c88b3ebb29f15795`
- remote worktree: clean

## 境界

`localhost:2222` relayのbanner timeout自体は残るため、WSL停止からの復旧経路までgreenとはしない。本taskが所有する明示interpreter hook実火とWindowsアプリ選択非再発は、jump hostからWSL IPへの正規SSH接続で直接観測した。

Lattice製品repoは変更していない。廃止済み`codex-rc`は利用・調査・復旧していない。ユーザー所有の未追跡`docs/evidence/fixtures/`は読まず、変更・stageしていない。
