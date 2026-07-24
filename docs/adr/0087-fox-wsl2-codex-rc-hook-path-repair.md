# ADR 0087: FOX WSL2 の codex-rc hook 登録先を現行 clone へ修正する

## 状態

採用（実装前裁定）

## 背景

Lattice 工程 `fm-0646` は、FOX WSL2 の `~/.codex/hooks.json` に残る
`/home/kite/projects/codex-rc/scripts/codex-rc-user-prompt-hook.js` が
`MODULE_NOT_FOUND` を起こす問題を扱う。実機では旧 clone が存在せず、現行 clone は
`/home/kite/Developer/codex-rc` にある。

所有監査では `codex-rc` と `scripts/codex-rc-user-prompt-hook.js` は現役であり、hook 本体は
script 所在 repo を既定にする設計へ更新済みだった。dotagents はこの外部 hook を生成・所有せず、
dotagents が所有するのは callout hook だけである。

## 決定

FOX WSL2 の `~/.codex/hooks.json` にある codex-rc UserPromptSubmit command の絶対 path だけを、
実在する `/home/kite/Developer/codex-rc/scripts/codex-rc-user-prompt-hook.js` へ更新する。

変更前に `~/.codex` を tar で退避する。更新は JSON の構造を保つ機械変換で行い、旧 path が1件だけ
存在することと新 path が実在することを前提条件にする。前提を満たさない時は変更しない。

## 非目標

- `codex-rc` hook の削除や `/rc` 機能の廃止
- dotagents installer に外部 hook の所有を移すこと
- Lattice 製品または Lattice repo の変更
- dotagents の canonical hook 群の追加・削除・並べ替え

## リスクと戻し方

対象は git 管理外の Codex 設定であり、誤編集すると全 UserPromptSubmit hook の起動に影響する。
JSON 妥当性と command の集合を変更前後で比較する。問題時は事前 tar から
`~/.codex/hooks.json` を復元する。

## 受入条件

1. 旧 `/home/kite/projects/codex-rc` 登録がゼロ、新しい実在 path の登録が1件である。
2. 通常 prompt を与えた hook 単体実行が exit 0、stderr 空、stdout 空である。
3. 新規 Codex session で `MODULE_NOT_FOUND` がなく、session が正常終了する。
4. dotagents canonical UserPromptSubmit hook が変更前後とも存在し、同じ session で正常に発火する。
5. 変更範囲、バックアップ、検証結果を Lattice `fm-0646` の証拠へ記録する。
