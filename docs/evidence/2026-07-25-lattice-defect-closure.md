# Lattice製品欠陥2件の解消受入（cf-0285 / fm-0657）

- 日付: 2026-07-25
- 対象: dotagentsが追跡だけを所有していたLattice製品欠陥2件
- 修理所有者: Lattice製品repo（別セッションが実施）
- dotagents側の役割: 公開版での解消確認と、追跡ticketの終端

## 追跡していた欠陥

| 追跡ID | 症状 | 記録時の再現版 |
|---|---|---|
| codex-full-support / cf-0285 | 一時clone上でcarried doneなtaskを`reopen`すると`STORE_INCONSISTENT` / `invalid_reopen_binding`になる | 0.11.2 |
| factory-master / fm-0657 | `lattice todo status --json`の出力を途中で閉じる（`\| head`等）と未処理EPIPEでexit 1になる | 0.11.2 |

## 製品側の修理（実物確認）

| 追跡ID | commit | 変更範囲 | characterization test |
|---|---|---|---|
| cf-0285 | `8a1310b` carried doneなtaskのreopenを可能にする | `src/todo-store.mjs` | `test/todo-reopen-carried-done.test.mjs`（新規128行） |
| fm-0657 | `847b18c` consumerが先にpipeを閉じた時のCLI異常終了を止める | `src/cli-stdio.mjs`（新規）・`bin/lattice.mjs` | `test/cli-stdout-epipe.test.mjs`（新規95行） |

いずれも「修理した」であり「既に直っていた」ではない。両commitとも本文にdotagents追跡IDを明記している。

原因はそれぞれ次のとおり。cf-0285は、revisionでcarryされたdoneが後継journalにdoneイベントを持たず
`plan_genesis`のstate migrationで完了が到着するのに対し、`resolveTargetedEvent`がdoneイベントだけを
探していたこと。fm-0657は、consumer終了後の書き込みが上げるEPIPEを未処理の`error`イベントのまま
落としていたこと。

## dotagents側の検証

- **公開版**: `@quolu/lattice@0.12.11`がglobal install済み（`lattice --version` = 0.12.11）。
  両修理は`8e04973`（0.12.10）より前のcommitであり、0.12.11に含まれる。
- **着地**: `git merge-base --is-ancestor 5ad3fb8 origin/main` が成功。0.12.11のrelease commitは
  Lattice `origin/main`の祖先であり、publish祖先gateを満たす。
- **characterization test実走**: 手元の0.12.11 source treeで
  `node --test test/cli-stdout-epipe.test.mjs test/todo-reopen-carried-done.test.mjs` を実行し、
  **8/8 pass**（fail 0 / skip 0）。carried done reopenの成立と、doneでないtaskのreopen拒否維持の
  両方を確認した。

### 手元で再現条件を作れなかった項目

fm-0657をdotagents repoの実storeで再現しようとしたが、`lattice todo status --json`の出力が5,635 bytesで
macOSのpipe buffer（64KB）に収まるため、consumerが先に閉じてもwriteは既に成功しており、EPIPEが
構造的に発生しない。**この環境で「再現しない」ことは修理の証明にならない**ため、成功の根拠には
含めず、上記のcharacterization test実走を根拠とする。

## 終端

- cf-0285 / fm-0657 は解消として`done`にする。
- これらの解消待ちで停止していた fm-0640（全Phase green宣言）と fm-0641（子計画未完ゼロ）は
  `unblock`する。両taskの作業内容そのものは未実施であり、blocked解除は完了を意味しない。
