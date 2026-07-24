# Mac端末メモリのrepo正典化 — 2026-07-20

## Scope

このMacのClaude Code dotagents project memoryにある索引外13件を実読し、repo正典へ置く共通規範、
既に正典化済みの重複本文、端末固有情報、局所事件記録に分類した。共通規範を端末メモリだけに
残さず、端末側は固有情報と正典ポインタだけを所有する状態を受入条件とした。

## Classification

| 分類 | memory | 処理 |
|---|---|---|
| 既存ポインタ | `converse-before-acting` | `shared/constitution.md` の応対規範を維持 |
| 既存ポインタ | `delegation-call-rules-canon` | `shared/orchestrate/delegation-contract.md` を維持 |
| 既存正典との重複本文 | `fable-orchestrates-codex-executes` | `shared/orchestrate/aiterm-dispatch.md` の親責務へのポインタへ縮約 |
| 既存正典との重複本文 | `no-blocking-delegation-waits` | 同文書の完了受信へのポインタへ縮約 |
| 未昇格の共通規範 | `carry-forward-rulings-across-units` | 共通憲法の応対規範へ裁定継承を追加し、ポインタ化 |
| 未昇格の共通規範 | `constitution-minimalism-criteria` | 共通憲法の規範文書作法へ統合し、ポインタ化 |
| 未昇格の共通規範 | `write-rules-positive-only` | 同じ規範文書作法へ肯定制限文を統合し、ポインタ化 |
| 未昇格の共通規範 | `no-task-ids-in-reports` | 共通憲法の報告規範へ統合し、ポインタ化 |
| 未昇格の共通規範 | `report-operational-first` | 共通憲法の報告規範へ統合し、ポインタ化 |
| 未昇格の共通規範 | `presentation-is-the-craft` | 共通憲法の報告受入へ統合し、ポインタ化 |
| 端末固有 | `network-flap-dont-conclude-offline` | repoへ一般化せず、内容を維持 |
| 端末固有の裁定 | `permissions-keep-bare-bash` | repoへ一般化せず、内容を維持 |
| 局所事件記録 | `long-session-generation-degrades` | 再現可能な共通規範へ昇格せず、内容を維持 |

## Changed canonical files

- `shared/constitution.md`
- generator出力 `claude/CLAUDE.md`
- generator出力 `codex/AGENTS.md`

共通憲法には事件経緯や日付を移植せず、現在必要な判断だけを4行へ圧縮した。

## Local-memory safety

- 編集前backup:
  `/Users/kite/Archives/dotagents-memory-pre-promotion-20260720.tar.gz`
- ポインタ化した8件はそれぞれ `正本:` 行を1件だけ持ち、旧 `Why` / `How to apply` 本文を持たない。
- 端末固有・局所事件の3件はbackup内と現在ファイルのSHA-256一致を確認した。
- memory fileの削除、project directoryの移動、backupの削除は行っていない。

## Verification

- `node bin/render-global-constitution.mjs --check`: green
- `make lint`: green
  - markdownlint 149 files / 0 errors
  - constitution parity green
  - skills smoke green
  - hooks smoke `ALL PASS`
- Lattice `factory-master` storeは完了証拠収容前の時点でstart transitionのみを保持し、
  証拠commit後にdone transitionを行う。
