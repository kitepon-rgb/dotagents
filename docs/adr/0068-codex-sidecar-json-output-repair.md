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
- factory設定失敗、auth引数エラー、async work lookupエラー: アプリ由来stderrなし
- CLI test: 32件green
- workspace build: green

初回実装案は小さいfixtureしか持たず旧実装でもgreenだったため棄却し、65 KiBを超える実CLI出力へ
回帰を強化した。さらに監査で他CLIの同型欠陥を実再現し、factoryだけの局所修理で閉じなかった。

公開前の最初のGitHub CIでは、Node 24が`node:sqlite`へ出す既知のexperimental warningを
アプリstderrと誤認する4 testが失敗した。npm publish前に停止し、この定型warningだけを区別して
その他のstderrを引き続き拒否する回帰へ修正した。Node 24でCLI test 32件を通し、exact-SHA CIが
greenになった後だけ公開した。

## Release state

Codex Sidecar 0.3.8として公開完了した。

- publication commit: `92a61198558df3e261c7d3a9e029877939db3d1a`
- exact-SHA CI:
  [GitHub Actions run 29664703626](https://github.com/kitepon-rgb/codex-sidecar/actions/runs/29664703626)
  がsuccess
- npm: `codex-sidecar-core@0.3.8` → `codex-sidecar-cli@0.3.8` →
  `codex-sidecar-mcp@0.3.8`の順にpublishし、3座標を再照会して確認
- pack / install: registry-safeなcore依存、fresh local-prefix install、fresh registry installがgreen
- post-publication smoke: 一時Docker HTTP initialize、global CLI / MCP initialize /
  factory-diagnosticsがすべて0.3.8。検証用containerを削除しColimaを停止状態へ戻した
- release:
  [GitHub Release v0.3.8](https://github.com/kitepon-rgb/codex-sidecar/releases/tag/v0.3.8)
  とannotated tagをpublication commitへ束縛
- Sidecar repoの完了台帳は
  `docs/archive/plan_factory-diagnostics-output-integrity.md`、最終受入は
  `docs/adr/0015-release-0.3.8-accepted.md`。統括記録は全phase完了、未解決・未回収・unknownなしで
  revision 44のarchivedまで閉じた
- Sidecar `origin/main`は公開後の台帳・ADR commit `c603538`まで反映済みで、release tag commitを
  祖先に持つ
