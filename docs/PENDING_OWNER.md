# オーナー承認・人手待ち（H タスク集約）

ベルの自律作業中に溜まった「クオ君にしかできないこと」の単一集約点。起きたらここを見れば人手が要る全件が分かる。消化したら打ち消し線＋日付。

## ログイン・認証

- [ ] **`grok login`**: Grok Build が未認証（"You are not authenticated"）。ログインすれば delegate の grok backend を実測→有効化でき、委譲先が Codex＋Grok の二枠になる（Claude レート非依存が倍に）。手順: `~/.grok/bin/grok login`。済んだらベルに言えば `grok agent {stdio\|headless}` の非対話形を実測して delegate grok を確定する。

## 承認待ち（ベルが提案済み・実行は承認後）

- [ ] **caveat 棚卸し: private→public 化 3件**（第三者再現可能な外部仕様罠。private のままだと他者が同じ罠で困っても検索で見つからない）:
  1. `ci/pnpm-action-setup-v4-packagemanager-version`（pnpm/action-setup@v4 の罠）
  2. `cloudflare/cloudflare-buffers-idle-sse...`（Cloudflare の SSE バッファリング）
  3. `claude-code/claude-code-auto-mode-classifier...`（Claude Code の分類器挙動）
  - private 妥当（変更不要）: bughub・codex-link-p2p・codex-link×2（repo/インフラ固有）
  - 承認くれれば `caveat_update` で visibility を public に変える。
- [ ] **ServerManager の master→main 正規化**: 稼働資産のためデプロイフック・他端末 clone が master 前提かの影響確認をしてから（自律ではリスク操作を避けた）。確認 OK なら ad-studio と同手順で正規化する。

## 別枠・後日（環境 PLAN 完了後）

- [ ] **Kikoeru GPL 対応**（出荷停止級・法務）: espeak-ng(GPLv3) の商用バイナリ静的リンク。方針判断＝(a)espeak 非依存 G2P へ置換 (b)XPC 分離 (c)ライセンス整理。着手時に専用調査を立てて rag へ。ダイジェスト: Kikoeru@a15efa3 の docs/audit-2026-07。
- [ ] **GitHub 側のみのリポ 20+件の終活**（forklore 以外の License-DB/OLTranslator/LiveTR/SessionHub/Trader 等）: 全端末の掃引が揃ってから archive/継続を裁定（この端末に無い＝不要とは限らない）。

## 他端末展開（各端末で実施＝Fable 不要）

- [ ] 各端末で README ランブック §0〜§4（前提導入→clone→退避→install→検証→メモリ整理）。**削除承認は端末ごとに取る**。**MacBook が作業する18リポには触らせない**（docs/OTHER_TERMINAL_KICKOFF.md）。

## 将来課題（実証後に検討・急がない）

- [ ] **delegate の MCP 化**: 現状は `~/.local/bin/delegate` のシェルコマンド＋CLAUDE.md 習慣で配布。実プロジェクトで委譲が回り「構造化返り値（変更ファイル/レビュー結果の JSON）」が本当に要ると判明したら専用 MCP を検討する。**aiterm-mcp には入れない**（公開済み汎用 PTF・責務汚染）。
- 記録: aiterm-mcp は 2026-07 の smux 評価で**コード無変更**（今日のコミット0・最新4週間前）。smux 機能は元から aiterm-mcp にあり、新規実装は dotagents/bin/delegate.sh。aiterm-mcp は18リポの標準化対象ではあるが「smux 機能追加」ではない。
