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

## delegate を MCP ツール化（2026-07-04 完了・オーナー指示で方針転換）

- **完了**: aiterm-mcp に `delegate` ツールを追加（**v0.5.0**・`core.delegate`＋index.ts 登録）。プロンプトで「使え」は発動が運任せ＝ツールとして渡せば AI のツール一覧に常在し確実に手に取れる、というオーナー判断。当初「aiterm-mcp には入れない（責務汚染）」としたが撤回——**自分の道具であり、codex 未導入時は明示 no-op で他利用者を壊さない**設計で解決。
- **デプロイ状態**: GitHub push 済み・**この Mac の npm-global へ `npm install -g .` で反映済み**（v0.5.0）。ただし**この端末で `mcp__aiterm__delegate` が見えるには Claude Code 再起動 or aiterm MCP 再接続が必要**（現接続は旧プロセス）。
- [ ] **他端末に効かせるには npm publish（公開）**: `aiterm-mcp@0.5.0` を npm へ publish → 各端末で `npm install -g aiterm-mcp@latest`（agents-update 経由でも）。**publish は公開操作なのでオーナーの OK 待ち**。publish しない場合、他端末はリポを clone して `npm run build` → `npm install -g .`。
