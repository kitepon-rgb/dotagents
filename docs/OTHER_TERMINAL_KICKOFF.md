# 他端末キックオフ — dotagents を貼るだけで環境整備を引き継ぐ

他端末で新しい Claude Code セッションを開き、下の「コピペ本文」をそのまま貼る。ベル（グローバル CLAUDE.md 昇格済み）が README ランブックに沿って環境を立て、その端末の掃引・トリアージ・メモリ整理まで進める。

## 全体順序（この端末＝他端末が読むべき位置）

**①MacBook で dotagents＋ツール完成（済）→ ②各端末で本キックオフ（＝今あなたがやる所）→ ③MacBook で18リポのブラッシュアップ**。あなた（他端末）は②。③は MacBook が担うので**下記18リポには触らない**。

## MacBook が作業する18リポ（他端末は触るな）

sprite-forge-mcp / codex-sidecar / ServerManager / MMOAuction / OpenCClaw / Caveat / WebAICoding / browser-to-api / videomarketing / nextflic / Chime / Spotter / aiterm-mcp / rpgdev / dotagents / dobojo / Throughline / Novel(forklore)

他端末がやるのは、**自端末の掃引・トリアージ・メモリ整理**と、**自端末が主作業（GitHub と同期 or ahead）のリポで、かつ上記18に無いもの**だけ。上記18リポは behind でも同期でも触らない（MacBook が主作業＝二重作業で競合する）。

---

## コピペ本文（新規端末・初回セットアップ）

```
ベル、この端末に開発工場（dotagents）を展開してほしい。GitHub が真実の源。

1. まだ dotagents が無ければ README ランブック §0〜§4 で立てる:
   前提確認(command -v で node>=22/docker/python3/claude/codex/markitdown/aiterm-mcp/caveat/codegraph) →
   gh repo clone kitepon-rgb/dotagents ~/Developer/dotagents → 既存実ファイルの退避(§2。~/.claude/CLAUDE.md と ~/.caveat/own に注意) →
   ./install.sh → ./bin/verify-install.sh が OK を返すまで
   既にあれば cd ~/Developer/dotagents && git fetch → origin/main と照合して pull（分岐したら止めて報告）

2. docs/PENDING_OWNER.md と docs/TODO.md と PLAN.md(聖典) で現在地を把握。**docs/OTHER_TERMINAL_KICKOFF.md の「MacBook が作業する18リポ」には触らない**

3. この端末で bin/sync-sweep.sh を実行 → docs/SYNC_LEDGER.md にこの端末セクションを追記 →
   git リポ＋非git を継続/この端末では休眠/削除候補に仮分類して一覧で俺に提案（削除承認は俺・端末ごと）。**上記18リポは掃引には出すが、標準化・ブラッシュアップは MacBook が担うので触らない**

4. この端末のメモリ整理（P4・bulk-curation。各端末のメモリはその端末でしか整理できない）

5. 週次自動更新の常設（README「自動アップデート」節・必須）: まず旧 npm 自動更新
   （crontab の npm 行・LaunchAgent の update-npm-globals 等）を掃引して撤去 →
   agents-update を launchd(macOS)/cron(Linux・WSL) に常設 → 一回実走行してログで検証

まず fetch と verify-install まで走らせて、状況を報告して。監査には走らないこと（工場整備が本旨）。18リポには触らないこと。
```

## コピペ本文（既存端末・更新のみ）

```
ベル、dotagents を最新化して環境整備の続きを進めて。
cd ~/Developer/dotagents && git fetch → 照合して pull → docs/PENDING_OWNER.md と docs/TODO.md で現在地確認 →
この端末で sync-sweep → SYNC_LEDGER に追記 → トリアージ提案 →
週次自動更新の常設（README「自動アップデート」節。旧 npm 自動更新の撤去→agents-update 常設→実走行検証）。
まず状況を報告して。
```

## 補足

- **削除承認は端末ごとに取る**（端末によって残す物が違いうる）。ベルは提案までで、削除は俺の承認後。
- **監査は横展開しない**（工場整備＝同期＋標準化＋CLAUDE.md に絞る。監査は俺が個別に頼んだ時だけ）。
- Grok を使うなら別途 `grok login`（H）。無くても委譲は Codex で回る。
- Novel(forklore) は作業中ロック中なら触らない（着手前に俺へ申告）。
