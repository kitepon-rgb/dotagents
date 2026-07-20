# ADR 0106: cf-0216 Throughline実行面の訂正

- Status: Accepted
- Date: 2026-07-21
- Scope: Lattice `codex-full-support/cf-0216`
- Supersedes: ADR 0103のThroughline実行面だけ
- Input: ADR 0103、ADR 0105、main-server Throughline handoff実測

## Context

ADR 0103は、Throughline captureとhandoffをCodex App Remoteの同一thread内で直列実行する境界を採用した。
しかしRemote App turnのsandboxはproject rootと`/tmp`以外への書込みを許さず、Throughlineが所有する
`~/.codex/sessions`へhandoff sessionを作成できなかった。read-onlyとworkspace-writeの2条件で同じ境界を確認し、
製品versionや配布物の不一致ではないこともlocal／main-server間のdigestで切り分けた。

## Decision

`cf-0216`のThroughline handoffは、次の相関をすべて満たす場合に限り、Remote App turnではなく
sessionを所有するmain-server host shellから実行してよい。

1. source Codex thread IDをhandoff commandへ明示する。
2. commandはsource transcriptと同じmain-server user homeで実行する。
3. 新threadのdeveloper handoff itemがsource thread IDを参照する。
4. 新thread transcriptのpath、size、digestを入口receiptへ保存する。
5. Remote LinuxからMac Desktopを開く操作はhandoff生成と分離し、`--open-host none`を使う。

2026-07-21の実測では、source thread `019f8058-c640-7b11-b51a-14b9b920e892`から
新thread `019f80f0-c1ca-7152-9a72-a815da1ab092`を作成し、developer handoff itemと新transcriptを確認した。
この相関はhandoff生成の受入を満たす。Codex App Remoteで新threadを表示できたことや、同一Desktop接続での
compact後callout再武装を証明するものではない。後者は横断工程`cf-0149`で継続する。

ADR 0103のRemote connection、project root、hook、skill、routing、Spotter、Claude回帰に関する他の条件は維持する。
ADR 0105はこの実測を受け入れたimmutableな完了裁定であり、本ADRはその実行面の理由を再利用可能な形で正本化する。

## F / A / H

- F: source／destination thread相関と受入範囲の裁定は親が所有する。
- A: host shellでのbounded handoff command実行とtranscript検証だけを実行面へ委ねる。
- H: 追加の権限変更、設定変更、UI操作は行わない。本goalの新規session実火承認範囲内である。

## Non-goals

- Remote LinuxからMac Codex Desktopを開くこと
- compact後callout再武装の受入
- Throughline製品の修理、設定変更、fallback実装
- Lattice製品、廃止済み`codex-rc`、`docs/evidence/fixtures/`の利用

## Rollback

本裁定は実行面だけを訂正し、repo、Throughline設定、Codex設定を変更しない。生成したhandoff sessionは監査証跡として
保持する。将来App Remote turnが正規にuser session storeへ書けるようになった場合も、入口変更は別の実測と裁定で行う。
