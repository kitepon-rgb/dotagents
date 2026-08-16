---
name: run-observer-parent-watch
description: 現在のCodex親からObserver production watchを起動・監視・停止・同一session回収する時に使う。Observer伴走、parent watch、長時間Observer監視の開始や再開を頼まれた時のCodex専用入口。
---

# Run Observer Parent Watch

Observerの公開`parent codex run`をforegroundで実行し、Codex標準execのsession handleを
親が保持する。Observer runtimeやstateを複製せず、providerは現在のCodex親に固定する。

## 手順

1. 対象project rootを`pwd -P`等でcanonical absolute pathへ確定する。custom state rootが必要なら
   absolute pathを明示する。cwd、環境変数、rateからproviderを推測しない。
2. `observer`、`throughline`、`codex`をread-onlyで探索し、それぞれabsolute executable pathを得る。
   欠落時は止まり、別providerやprivate protocolへfallbackしない。credentialやhost configは読まない。
3. `observer watch status <project-root>`を一度確認する。
   - `not_started`: previous watch引数を付けない。
   - `stopped`または`faulted`: 返されたexact watch IDを
     `--expected-previous-watch-id`へ渡す。
   - `starting`、`launching`、`active`、`stopping`: 新しいwatchを起動せず、そのwatchを報告する。
4. live Codex provider、model request、hook trust等に必要な承認が未取得なら、目的・影響・停止方法を
   示して承認を待つ。承認済みなら、Codex標準execをPTY付きforegroundで使い、次を実行する。

   ```bash
   /absolute/path/to/observer parent codex run /absolute/project/root \
     --throughline-command /absolute/path/to/throughline \
     --codex-command /absolute/path/to/codex
   ```

   必要な時だけ`--state-root`、`--expected-previous-watch-id`、`--timeout-seconds`、
   `--poll-interval-ms`、`--plan-ref file:<relative-path>`を追加する。`--runtime-root`は渡さない。
5. execがrunning sessionを返したら、そのsession IDを同じtaskのopaque handleとして保持する。
   同じhandleを標準のstdin/poll入口で観測し、timeout後も同じhandleを回収する。重複起動しない。
6. 停止が必要なら同じforeground sessionへSIGINTを送り、terminal resultまたはfail-loud errorまで
   同じhandleを回収する。shell background、`&`、`nohup`、daemon、自動respawnを使わない。

## 結果契約

- stdoutの成功は`observer.codex_parent_caller_result.v1`一行だけを受け入れる。
- exit 130はcancel、非0はverification／known fault／cleanup failureとしてそのまま報告する。
- spawn、ready、model result、terminalがunknownなら成功へ丸めず、別transport、別thread、別spawnを
  試さない。
- raw prompt、model output、credential、token、cookie、host log、private handleを転記しない。
