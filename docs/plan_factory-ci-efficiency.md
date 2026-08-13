# Factory CI efficiency

## 目的

- Markdownだけの変更で4環境fullを実行しない。
- 製品変更は対応する全環境で同じfull testを並列実行する。
- checkout・依存導入・試験本体の時間を分け、依存導入が支配的な製品だけ標準キャッシュを使う。

## 実施

1. 共通workflowで変更をMarkdownだけか、それ以外かに分類する。
2. 製品callerで依存導入とfull testのコマンドを分離する。
3. caller変更による実CIのstep時間を確認する。
4. 依存導入が支配的と実測できた製品だけ、package managerの標準キャッシュを追加する。

## 受入

- Markdownだけの変更はLinux 1環境で終わる。
- 製品変更は対象全環境でcheckout・dependency install・product full testが別stepとして成功する。
- 独自キャッシュ層、製品別path-to-test表、OSごとの役割分散を追加しない。
