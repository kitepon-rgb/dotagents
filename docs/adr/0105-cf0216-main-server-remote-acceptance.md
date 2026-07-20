# ADR 0105: cf-0216 main-server Remote受入

- Status: Accepted
- Date: 2026-07-21
- Decision owner: codex-parent-019f7df0
- Task: `codex-full-support/cf-0216`

## Decision

main-serverのCodex App Remote／CLIとClaude回帰を、`cf-0216`の受入として完了する。

受入証拠は
`docs/evidence/2026-07-21-cf0216-main-server-codex-app-remote.json`を主とし、CLI hook trust、
CLI runtime、Claude回帰、remote preflightの各証跡を従とする。

## Accepted facts

- CLI `/hooks`で15件を個別reviewし、未trustを0にした。
- Codex Desktop originatorのRemote新規thread
  `019f8058-c640-7b11-b51a-14b9b920e892`で、初回context、2回目沈黙、PreToolUse、
  Stop pendingの1回配送後の沈黙を実火した。
- dotagents配布`orchestrate` skillをruntimeで選択し、implementer／refuter／sorterの実効
  model・effort・developer instructionsを正規verifierで確認した。
- Throughline captureはsource threadと一致し、main-server host shellからfresh thread
  `019f80f0-c1ca-7152-9a72-a815da1ab092`を作成した。新thread transcriptにdeveloper handoff
  itemが存在する。Remote LinuxからMac Desktopを直接openしないため、UI openは`none`として
  deep linkとresume commandを返す境界を採用した。
- Claude新規sessionでglobal instructions、skill、implementer、aiterm、Caveat、Spotterの代表回帰が
  greenである。
- 開始・終了ともremote worktreeはHEAD
  `a0e77059d7a4aa1ed1800abf2c9a3ee280b0b2a1`でcleanであり、一時probeは残っていない。
- Spotter diagnosticsはhook event 95件、parse error 0件、runtime error 0件。`make lint`と
  `lattice todo verify --plan codex-full-support --json`はgreenである。

## Boundaries and follow-up

- compact event自体は記録したが、同一Desktop接続でのcallout再武装は未証明である。これは
  `cf-0216`の明示タイトルへ追加せず、既存の横断E2E `codex-full-support/cf-0149`で継続する。
- App turn内のhandoff失敗2回は、read-only／repo限定workspaceWrite sandboxから
  `~/.codex/sessions`へ書けなかったharness設定ミスであり、Throughline製品不具合ではない。
- main-serverには専用Chromeがなく、gpt-connector consultationは`CDP_UNAVAILABLE`、browser startは
  non-macOS `INVALID_INPUT`である。Oracleや通常Chromeへfallbackせず、ADR 0103の非目標を維持する。
- Stop pendingのdirty→clean表示が「0ファイル／コミット0」になるdotagents欠陥は、Lattice
  `codex-full-support/cf-0283`へ正規revision transactionで登録した。Lattice本体は変更しない。

## Safety

`codex-rc`は使用していない。ユーザー所有の`docs/evidence/fixtures/`は読まず、変更・stage・commit対象にも
含めない。Lattice製品repoは変更していない。
