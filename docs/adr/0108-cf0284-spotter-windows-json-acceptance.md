# ADR 0108: cf-0284 Spotter Windows診断JSON受入

## 状態

Accepted — 2026-07-21

## 文脈

Windows PowerShell 5.1で`spotter diagnostics logs --json`をnative pipelineへ渡すと、UTF-8の
全角括弧を含む履歴tool名が誤復号され、`ConvertFrom-Json`が失敗した。Nodeがbyte列として受けた
同じ出力はUTF-8・JSONとも妥当だった。

## 決定

- 欠陥の所有者はSpotterとし、Lattice製品repoは変更しない。
- Spotterの診断JSONだけをASCII安全化し、非ASCII文字をJSON Unicode escapeで出力する。
- parse後の値、hook event、runtime状態は変更しない。
- Spotter 1.4.27を公開し、4 hostへ導入後、Windows実ログで`ConvertFrom-Json`成功を受入条件とする。

## 受入結果

- Spotter実装commit `eb1efbd0728d44ff47b676d443597c6eab44c2fb`。
- GitHub Actions CI 6/6 success、npm `latest=1.4.27`、GitHub Release `v1.4.27`。
- Mac、main-server、FOX WSL2、FOX Windows nativeの4 hostで`spotter 1.4.27`。
- Windows実ログ291件、hook event 19件、parse error 0件を`ConvertFrom-Json`で変換成功。
- 詳細証拠は
  [cf-0284修理証拠](../evidence/2026-07-21-cf0284-spotter-windows-json-repair.md)を正とする。

## Rollback

各hostを`claude-spotter@1.4.26`へ戻せる。ただし1.4.26ではPowerShell 5.1の同じ診断経路が再び
壊れるため、緊急時以外は1.4.27を維持する。
