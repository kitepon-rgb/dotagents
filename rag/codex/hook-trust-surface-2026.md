# Codex hook trust入口（2026-07）

- 出典: OpenAI Codex Manual（CLI slash commands、IDE slash commands、Hooks）
- 取得日: 2026-07-21
- 確度: 高（公式manual＋Codex App Remote実測）
- 一次ソースpointer: [[raw/openai-codex-hook-trust-surfaces-20260721]]

## 結論

- hookのreview／trust入口は、対話Codex CLIの`/hooks`である。
- Codex App／IDE extensionのslash command一覧に`/hooks`はない。
- App Remoteで`/hooks`を送ると通常promptとしてagentへ配送され得る。これはhook設定の欠陥を意味しない。
- remote hostでは、そのhostの同じuser homeを使うCLIでtrustした後、App Remoteの新規threadで実火を確認する。
- `--dangerously-bypass-hook-trust`は、既に別経路でhook sourceを検証したone-off automation用であり、
  通常の永続trust受入には使わない。

## dotagentsへの適用

`cf-0216`ではmain-serverの対話Codex CLIで`/hooks`をreview／trustし、Codex App Remoteは新規thread、
hook lifecycle、skill、routing、Throughline、Spotterの入口固有実火を所有する。CLI greenをApp実火へ拡張しない。
