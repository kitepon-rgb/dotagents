# オーナー承認・人手待ち（H タスク集約）

ベルの自律作業中に溜まった「クオ君にしかできないこと」の単一集約点。起きたらここを見れば人手が要る全件が分かる。消化したら打ち消し線＋日付。

## ログイン・認証

- [x] **`grok login`**: 2026-07-04 ログイン済み（"logged in with grok.com"）。aiterm の `grok_agent`/`composer_agent`（対話）で Grok/Composer を駆動可能。非対話ワンショットは `grok -p "<prompt>" --output-format plain` が実測で動作（将来 codex-sidecar 側に grok 委譲を足す余地あり）。

## 承認待ち（ベルが提案済み・実行は承認後）

- [ ] **caveat 棚卸し: private→public 化 3件**（第三者再現可能な外部仕様罠。private のままだと他者が同じ罠で困っても検索で見つからない）:
  1. `ci/pnpm-action-setup-v4-packagemanager-version`（pnpm/action-setup@v4 の罠）
  2. `cloudflare/cloudflare-buffers-idle-sse...`（Cloudflare の SSE バッファリング）
  3. `claude-code/claude-code-auto-mode-classifier...`（Claude Code の分類器挙動）
  - private 妥当（変更不要）: bughub・codex-link-p2p・codex-link×2（repo/インフラ固有）
  - 承認くれれば `caveat_update` で visibility を public に変える。
- [x] ~~**ServerManager の master→main 正規化**~~ 2026-07-04 完了（オーナー承認「サーバーもやっていい」）: 影響実測（server crontab の毎分 pull・常駐エージェント指示文の push 先・ci.yml・正本 URL）→ 4ファイル修正を master 最終コミットで push → server 自動 pull 確認 → GitHub rename → server clone/crontab/Mac clone を main へ追従。検証: cron の75秒窓でエラー行増加ゼロ＝毎分 pull が main で無音成功。
- [ ] **Caveat の Windows CI が5月末から赤（既存不良・FOX 端末向き）**: 全 dependabot PR と main push で windows-2022/2025 ジョブが失敗。原因の芯: `'C:\Program' is not recognized`＝空白入りパス（process.execPath）を CAVEAT_CODEX_SIDECAR_COMMAND 経由でコマンド文字列としてシェル実行する連鎖（apps/cli/src/commands/hookCmd.ts:480 → codex-sidecar CLI 側の shell 実行）の未クオート。**修正検証に Windows 実機が必要＝FOX 端末が最適**（macOS からの盲目修正は CI ガチャになるので見送り裁定 2026-07-04）。ubuntu/macos ジョブは green。
- [ ] **codex-sidecar-cli/core の運用形態**: npm link 前提とされていたが、実際は旧 tools-manager cron が 2026-06-29 に link を registry 版で置換済み＝以後 registry 運用で無症状だった。agents-update に正式収載して現状追認済み（2026-07-04）。**link 開発（ローカル最新を即時反映）へ戻したいなら**、リストから外して `npm link` し直す——判断求む。戻さないなら現状のままで完。

## 別枠・後日（環境 PLAN 完了後）

- [ ] **Kikoeru GPL 対応**（出荷停止級・法務）: espeak-ng(GPLv3) の商用バイナリ静的リンク。方針判断＝(a)espeak 非依存 G2P へ置換 (b)XPC 分離 (c)ライセンス整理。着手時に専用調査を立てて rag へ。ダイジェスト: Kikoeru@a15efa3 の docs/audit-2026-07。
- [ ] **GitHub 側のみのリポ 20+件の終活**（forklore 以外の License-DB/OLTranslator/LiveTR/SessionHub/Trader 等）: 全端末の掃引が揃ってから archive/継続を裁定（この端末に無い＝不要とは限らない）。

## FOX(Windows native) 端末のブロッカー（2026-07-04 掃引・詳細は SYNC_LEDGER の FOX セクション）

- [x] ~~**Windows 開発者モードを ON**~~ 2026-07-04 完了: オーナーが ON → §2 退避（実ファイルは削除でなく `~/Archives/pre-dotagents-20260704/` へ移動＝可逆）→ `MSYS=winsymlinks:nativestrict ./install.sh` → **verify-install OK（全エントリ本リポ向き symlink）**。caveat own も symlink 化し検索の動作確認済み。~/.codex/rules/default.rules の端末版は死んだ許可3行のみ＝退避して正本に差し替え。
- [x] ~~dotagents clone パスの裁定~~ **2026-07-04 オーナー裁定: 現行 `~/Documents/Program/dotagents` のまま（Windows 端末の例外として容認・移設しない）**。
- [x] ~~**python3 のストア偽エイリアス無効化**~~ 2026-07-04 完了（オーナー承認の上でベル実施）: 偽エイリアスを ~/Archives へ退避し、実 Python の場所に `python3` symlink を新設。`python3 -c "print(1)"` の実行判定で本物を確認済み。ランブック §0 の判定方法修正提案は SYNC_LEDGER FOX 特記事項に記載済み（MacBook 向け）。
- [x] ~~FOX(Windows) のトリアージ承認~~ 2026-07-04 オーナー裁定済み・実施済み（端末依存の処理につき詳細は端末ローカル記録のみ）。
- [x] ~~**FOX(Windows) の GitHub private リポ作成 2件**~~ 2026-07-04 完了（オーナー実行・private/既定main/同期をベル検証済み）:
  ```powershell
  # PowerShell 5.1 は && 非対応につき ; 区切り（Git Bash なら && でも可）
  cd ~/Documents/Program/PCManager; gh repo create kitepon-rgb/PCManager --private --source . --remote origin --push
  cd ~/Documents/Program/VoiceTransrator; gh repo create kitepon-rgb/VoiceTransrator --private --source . --remote origin --push
  ```
- [x] ~~**LiveTR のリモート旧枝 `origin/master` 削除**~~ 2026-07-04 完了（オーナー実行・`fetch --prune` で消滅確認済み。残枝は main のみ）。

## 他端末展開（各端末で実施＝Fable 不要）

- [ ] 各端末で README ランブック §0〜§4（前提導入→clone→退避→install→検証→メモリ整理）。**削除承認は端末ごとに取る**。**MacBook が作業する18リポには触らせない**（docs/OTHER_TERMINAL_KICKOFF.md）。

## 外部エージェント委譲の最終形（2026-07-04 確定・オーナー設計）

- **対話型 → aiterm v0.7.0 の `codex_agent`/`grok_agent`/`composer_agent`**（モデルごとに1ツール・名前で分かる・`reasoning_effort` 引数）。GitHub push＋この Mac の global 反映済み。実測: grok_agent 起動を確認済み。
- **非対話 → codex-sidecar の `codex_work`/`codex_review` 等**（既存の成熟した委譲面）。
- 経緯: 一時 aiterm に非対話 `delegate` を入れた（v0.5-0.6）が、aiterm は対話型・delegate は非対話でパラダイム不整合＝撤去（v0.7.0）。dotagents の `bin/delegate.sh` も削除。
- [x] ~~**他端末に効かせるには aiterm-mcp を npm publish（公開・OK 待ち）**~~ 2026-07-04 完了: `aiterm-mcp@0.7.1` を **Trusted Publishing（OIDC）＋provenance 付き**で publish（NPM_TOKEN 失効が原因の CI E404 を機に、トークン全廃の根本修正へ移行。以後は tag push だけで出荷）。MCP Registry も 0.7.1 で再登録済み。各端末は `npm install -g aiterm-mcp@latest`（または週次 `agents-update`——対象リストに追加済み）→ Claude Code 再起動。
  - [ ] （任意・推奨）npmjs.com の Publishing access を「Require two-factor authentication and disallow tokens」に締める（OIDC 動作確認済みの今が締め時。オーナーの画面操作）。
- [ ] （余地）codex-sidecar に grok/composer の非対話委譲ツールを足す（grok は `-p ... --output-format plain` で動作確認済）。codex-sidecar は tier1 なので慎重に。
