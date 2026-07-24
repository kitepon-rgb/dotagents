# Lattice 0.11.2 未解消欠陥の隔離再現

- 日付: 2026-07-21
- installed / registry / source repo version: `0.11.2`
- Lattice source repo: clean、`origin/main...HEAD = 0/0`
- Lattice source変更: なし

## stdout EPIPE (`fm-0657`)

```sh
set -o pipefail
lattice todo status --json | head -c 1200 >/dev/null
```

- 結果: Node.jsの未処理`Error: write EPIPE` stack trace
- pipeline exit: `1`

## carried done reopen (`cf-0285`)

dotagentsの現在HEADを一時ディレクトリへ`git clone --no-local`し、そのcloneだけで実行した。

```sh
lattice todo reopen --plan codex-full-support --task cf-0020 \
  --reason 'isolated reproduction only'
```

- 結果: `STORE_INCONSISTENT`
- detail: `invalid_reopen_binding`
- exit: `1`
- 元のdotagents storeへのmutation: なし

2件とも0.11.2で再現する。dotagentsは再現と工程追跡だけを所有し、Lattice製品修正は別セッションへ委ねる。
