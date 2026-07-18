# ADR 0068: Codex Sidecarのmachine-readable JSON途中切れ修理を受け入れる

Date: 2026-07-19

## Decision

工場診断で、global導入済みCodex Sidecar 0.3.7がJSONを途中で切りながらexit 0を返すP1を検出した。
正規repo `/Users/kite/Developer/codex-sidecar`で次の2段階修理を受け入れた。

1. `factory-diagnostics`のready、not-ready、設定失敗を、stdout完了後に既存終了コードで終了させた。
2. 通常`diagnostics`、auth、非同期work、factory error store、通常workflow結果を含む全machine-readable
   CLIへ同じ完全出力契約を適用した。

## Evidence

- factory専用修理commit: `a55c441`
- factory受入Decision: `f63a3bb`
- 全machine-readable CLI修理commit: `736e0fd`
- 全CLI受入Decision: `5cd1575`
- factory大容量not-ready、EPIPE、privacy回帰: green
- 100,000文字promptの`diagnostics`実process pipe: 完全JSON、exit 0
- factory設定失敗、auth引数エラー、async work lookupエラー: stderr空
- CLI test: 32件green
- workspace build: green

初回実装案は小さいfixtureしか持たず旧実装でもgreenだったため棄却し、65 KiBを超える実CLI出力へ
回帰を強化した。さらに監査で他CLIの同型欠陥を実再現し、factoryだけの局所修理で閉じなかった。

## Release state

修理はCodex Sidecar repoのlocal mainへcommit済みで、origin/mainより7 commit先行している。
version bump、pack / fresh install、push、CI、npm publish、global install、公開後smoke、tag / GitHub Releaseは
未実施である。公開済みまたはglobal修理済みとは扱わない。
