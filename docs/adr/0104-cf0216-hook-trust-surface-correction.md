# ADR 0104: cf-0216 hook trust入口の訂正

- Status: Accepted
- Date: 2026-07-21
- Scope: Lattice `codex-full-support/cf-0216`
- Supersedes: ADR 0103のhook trust入口とrollback入口だけ
- Input: OpenAI Codex Manual（CLI／IDE slash commands、Hooks）、main-server Codex App実測

## Context

ADR 0103は、Codex App Remoteの新規thread内で`/hooks`を開き、hook trustを完了する境界を採用した。
しかしmain-server Remote projectをCodex Appで開いて`/hooks`を送信すると、slash commandとして処理されず、
通常のuser promptとしてagentへ配送された。

2026-07-21取得のOpenAI Codex Manualでは、`/hooks`はCodex CLIのbuilt-in slash commandとして定義され、
Codex App／IDE extensionのslash command一覧には含まれない。Hooks章も、trustの正規入口をCLIの`/hooks`とする。

## Decision

`cf-0216`のhook trustは、main-serverの`/home/kite/Developer/dotagents`で起動した対話Codex CLIの
`/hooks`だけを正規入口とする。そこで現在のhook definitionをreviewしてtrustし、同じremote user homeを使う
Codex App Remoteの**新規thread**でhook lifecycle、skill、routing、Throughline、Spotterを直接実火する。

Codex Appへ`/hooks`を送ってtrust画面が開くことは受入条件にしない。Appへ通常promptとして配送された実測を
失敗したtrust操作やhook製品欠陥へ読み替えない。ADR 0103の8項目中、次だけを置き換える。

- 旧: Codex App Remote threadの`/hooks`でUI trustとreview残数0
- 新: main-server対話Codex CLIの`/hooks`でtrust完了を保存し、trust後のCodex App Remote新規threadで実火

Remote connection名、project root、新規App thread ID、hook lifecycle、skill、3-role routing、Throughline、
Spotter、Claude回帰を入口receiptへ結ぶ他の条件は維持する。

## F / A / H

- F: 入口訂正、公式仕様との突合、trust結果とApp thread実火の相関は親が裁定する。
- A: 既に受入済みのreadiness／Claude回帰は再実装しない。
- H: CLIの`/hooks`で現在のhook hashを永続trustする操作。オーナー承認は本goalで受領済み。

## Rollback

trustの撤回・個別hookの無効化は、同じmain-server対話Codex CLIの`/hooks`だけから行う。
Codex App、設定ファイルの手編集、`--dangerously-bypass-hook-trust`で代替しない。

## Evidence boundary

- 公式仕様の再利用可能な要約: `rag/codex/hook-trust-surface-2026.md`
- 一次ソースpointer: `rag/codex/raw/openai-codex-hook-trust-surfaces-20260721.md`
- Codex App実測: `main-server` Remote projectで`/hooks`が通常promptとして配送
- Lattice製品、廃止済み`codex-rc`、`docs/evidence/fixtures/`は未使用
