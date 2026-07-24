# ADR 0107: cf-0283 Stop pending cleanup受入

## 状態

受入済み

## Decision

Lattice `codex-full-support/cf-0283` の受入として、Codex Stop hookのrolling snapshotへ
porcelain hashとHEADだけでなく変更path集合を保存する。dirtyから同一HEADのcleanへ遷移した時は、
直前snapshotのpath/countを使って「作業差分を解消」と明示し、現行clean porcelainから
「0 ファイル/コミット 0」と誤表示しない。

配布済み端末に残る旧2行snapshotは、path集合が無いこと自体をエラーや0件の証拠にせず、
「dirtyだった作業差分を解消」と表示する。次回snapshot書込みで新しい3行形式へ自然移行する。

## Cause and implementation

旧snapshotはporcelainのSHA-1とHEADだけを保存していた。次のStopでdirty差分がcleanへ戻ると、
hash変化は検出できる一方、path抽出元が空の現行porcelainしか残らず、pending本文が
「0 ファイル/コミット 0」になっていた。

`bin/codex-callout-hook.sh`はsnapshotの3行目へ正規化済みpath配列をJSONで保存する。
同一HEADのdirty→cleanだけをcleanup遷移として分類し、commitを伴うclean化は従来どおり
HEAD間diffとcommit数を使う。snapshot破損時は現行状態へ更新して沈黙する既存の安全境界を維持する。

## Verification

`bash tests/hooks/codex-smoke.sh`を実行し、全caseがpassした。追加したfocused caseは次の2件である。

- 新3行snapshot: 変更path `source.txt` を保持し、「1 ファイルの作業差分を解消」と表示する。
- 旧2行snapshot: path数を捏造せず「dirtyだった作業差分を解消」と表示する。

両caseともpending本文に`0 ファイル`が無いことを直接検証した。既存のclean、dirty、
Stop active、gate off/block、pending drain、compact rearm、Lattice hook caseも同じrunでgreenだった。
`git diff --check -- bin/codex-callout-hook.sh tests/hooks/codex-smoke.sh`もpassした。

## Boundaries

Lattice製品repoは変更していない。Latticeは工程storeとしてだけ利用した。廃止済み`codex-rc`と、
ユーザー所有の`docs/evidence/fixtures/`は使用・読取・変更・stage対象にしていない。

同じwaveで進めたSpotter cross-host受入は
`docs/evidence/2026-07-21-cf0150-spotter-cross-host-progress.md`へ分離し、Windows nativeの
外部toolchain blockerが残るため`cf-0150`を完了扱いにしていない。
