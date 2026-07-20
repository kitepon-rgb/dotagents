# ADR 0089: FOX WSL2 codex-rc hook 廃止受入

## 状態

受入済み

## 裁定

ADR 0088 に従い、FOX WSL2 の `~/.codex/hooks.json` から廃止済み `codex-rc` の
UserPromptSubmit hook を除去した。ADR 0087 の path 更新は実行していない。

## 実施結果

- 変更前の完全一致件数: 1
- 変更後の codex-rc hook 件数: 0
- backup:
  `/home/kite/.codex-backups/codex-hooks-before-codex-rc-retire-20260720T0803Z.tar.gz`
- 残る UserPromptSubmit command は Throughline、Caveat、Spotter、dotagents callout の4本。
- codex-rc 以外の command 集合と順序は変更前後で一致した。
- `jq empty ~/.codex/hooks.json` は成功した。

## 新規 session smoke

FOX WSL2 の Codex CLI 0.144.6 で新規 `codex exec --json` session を開始した。

- thread: `019f7e8d-e86f-7320-9f0e-863dcf36d6fb`
- exit: 0
- final: `FM0646_CODEX_SESSION_OK`
- `MODULE_NOT_FOUND`: なし
- dotagents UserPromptSubmit hook の初回状態:
  `/home/kite/.cache/dotagents/hooks/9852e176a02e9280da3524e5dd418de8fcd845d74959c84f21c35d8124106635.codex-onset-info`
  が生成された。

以上により Lattice `factory-master/fm-0646` の受入条件を満たす。

## 非実施

- `codex-rc` repo、GitHub repository、FOX WSL2 local cloneは変更・削除していない。
- Lattice 製品・repoは変更していない。
