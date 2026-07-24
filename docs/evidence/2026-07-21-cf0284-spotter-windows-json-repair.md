# cf-0284 Spotter Windows診断JSON修理証拠

## 結論

Spotter 1.4.26の`spotter diagnostics logs --project <dotagents> --json`は、Windows PowerShell 5.1が
native stdoutのUTF-8を誤復号するため、全角括弧を含む履歴tool名のJSON keyを壊していた。
Spotter 1.4.27で非ASCII文字をJSON Unicode escapeへ変換し、Windows実ログを
`ConvertFrom-Json`で読めることまで確認した。

## 再現と原因

- Windows native、Spotter 1.4.26、dotagents実ログ291ファイルで再現。
- PowerShell 5.1の`ConvertFrom-Json`は位置41892で失敗し、周辺は
  `"Agent�E�Eubagent_type=Explore�E�E: 3`と壊れていた。
- 同じCLIをNodeからbyte列として受けるとUTF-8は妥当で`JSON.parse`も成功し、元のkeyは
  `Agent（subagent_type=Explore）`だった。
- よってログparserやJSON構造ではなく、PowerShell 5.1のnative stdout復号境界が原因。

## 修理

- 所有repo: `/Users/kite/Developer/Spotter`
- 実装commit: `eb1efbd0728d44ff47b676d443597c6eab44c2fb`
- 公開証跡commit: `2dbc317`
- 変更: `spotter diagnostics logs --json`の非ASCII文字を`\uXXXX`で出力。
- 回帰test: `runDiagnosticsLogsCommand`がASCII-onlyで、escape後も`JSON.parse`で元のkeyを復元することを確認。
- Lattice製品repoは変更していない。

## 検証と公開

- focused test: `test/daemon-log-diagnostics.test.mjs` 5/5 pass。
- Spotter全test: `npm test` exit 0。
- GitHub Actions CI: 6/6 success、run `29780153648`。
- npm: `claude-spotter@1.4.27`、`latest=1.4.27`、shasum
  `4d45c85f3628e7e4e73b0895b074b005fa318671`。
- GitHub Release: <https://github.com/kitepon-rgb/Spotter/releases/tag/v1.4.27>
- global install: Mac、main-server、FOX WSL2、FOX Windows nativeの4 hostすべて`spotter 1.4.27`。
- Windows実ログ再検証: `ConvertFrom-Json`成功、files=291、hook events=19、parseErrors=0、
  `asciiOnly=true`、`escapedFullwidth=true`。

## Rollback

問題があれば各hostを`npm install -g claude-spotter@1.4.26`へ戻せる。1.4.27は診断JSONの
非ASCII表現だけを変更し、JSON parse後の値とhook/runtime状態は変えない。
