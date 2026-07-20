# ADR 0088: FOX WSL2 の codex-rc hook 登録を廃止する

## 状態

採用（ADR 0087 を破棄）

## オーナー裁定

`codex-rc` は廃止済みプロジェクトであり、一切使用しない。履歴は GitHub に残せば十分である。

## 決定

FOX WSL2 の `~/.codex/hooks.json` から、codex-rc の
`scripts/codex-rc-user-prompt-hook.js` を呼ぶ UserPromptSubmit hook エントリを削除する。
旧 path を現行 clone へ更新する ADR 0087 は実行せず、本 ADR で破棄する。

変更前に `~/.codex` を tar で退避する。削除は codex-rc command に完全一致するエントリ1件だけを
対象とし、他の UserPromptSubmit hook の配列要素と順序は維持する。

## 非目標

- `codex-rc` repo、GitHub repository、履歴の変更・削除
- FOX WSL2 にある local clone の削除
- Lattice 製品または Lattice repo の変更
- dotagents canonical hook 群の追加・削除・並べ替え

## リスクと戻し方

対象は git 管理外の Codex 設定であり、誤編集すると他の hook 起動に影響する。JSON 妥当性と
codex-rc 以外の command 集合・順序を変更前後で比較する。問題時は事前 tar から
`~/.codex/hooks.json` を復元する。

## 受入条件

1. codex-rc hook 登録と旧 `/home/kite/projects/codex-rc` 参照がともにゼロである。
2. codex-rc 以外の hook command 集合・順序が変更前後で同一である。
3. 新規 Codex session で `MODULE_NOT_FOUND` がなく、session が正常終了する。
4. dotagents canonical UserPromptSubmit hook が同じ session で正常に発火する。
5. 変更範囲、バックアップ、検証結果を Lattice `fm-0646` の証拠へ記録する。
