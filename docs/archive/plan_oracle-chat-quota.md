# plan: Chat枠 GPT-5.6 を MCP で常用する（oracle 無改造構成）

前提: Fable 級統括／oracle 0.15.2・GPT-5.6 世代（2026-07 時点）。
状態: **全項目完了（2026-07-11。新セッション疎通確認 Claude/Codex 両 green まで消化）** → docs/archive/ へ退避済み。本ファイルが正本＝TODO を兼ねる。
運用ランブックの正典は [06_oracle-mcp.md](06_oracle-mcp.md)。本プランは経緯と消化の台帳。

## Context — 目的と要件

Codex / Claude の親エージェントから、**ChatGPT サブスクの Chat枠で GPT-5.6 を MCP 経由の第二意見に使う**。Work枠（Codex 消費分）と別勘定になるためコストメリットが大きい。制約:

- **追加課金 API は不可**（`OPENAI_API_KEY` 課金なし・サブスクのみ）
- **他人のプロダクト本体は改造しない**
- **不可視で動く**（最低ヘッドレス相当）・**使用後ブラウザを確実に閉じる**
- もっとスムーズな製品があれば Oracle から乗り換えてよい（→調査の結論: 現存しない）

## 調査結論（2026-07-11・一次ソース裏取り済み）

1. **Chat枠を課金なしで叩く経路は Web UI 自動化しかない**（公式プログラマティック経路なし。Codex OAuth は Work枠）。
2. **真のヘッドレスは Cloudflare の壁**: oracle 実装コメント「Cloudflare blocks it」と ChatGPT-Web2API README が独立に一致。検知回避ブラウザ系の保守された製品は現存せず、自作は ToS 違反＝Pro アカウント BAN リスク。
3. **乗り換え候補の実勢**: ChatGPT-Web2API（4★・ヘッドレス不可・cookie 2週失効・単一セッション）／AppleScript 系（フォーカス奪取・日本語応答検出不安）／cbusillo（アーカイブ死）→ **oracle より上は現存しない**。
4. **oracle が最成熟**。GPT-5.6 対応は upstream 進行中（issue #303/#305・PR #304/#306、07-10）。

詳細と実装読解・実測罠は [rag/tools/chatgpt-chat-quota-mcp-survey.md](../rag/tools/chatgpt-chat-quota-mcp-survey.md)。

## 実装中に判明した事実（当初プランからの変更点）

1. **Node undici の `setTypeOfService` EINVAL 即死**（計画外の新発見）: Node 24.18/26.4 の undici が全 HTTP/1.1 リクエストで無ガード呼び出し → macOS で未捕捉例外＝プロセス死。MCP サーバーの「静かな接続クローズ」の正体。→ **新規成果物 [bin/oracle-mcp-stable.sh](../bin/oracle-mcp-stable.sh)**（`--import` ガード付きラッパー）で無害化し、MCP 登録もこれに変更。
2. **`hideWindow` は不採用**（当初案から変更）: Cmd-H 非表示は描画停止で**送信が発火せず下書き滞留→後続 run に混入**（実測）。不可視化は**画面外シム [bin/oracle-chrome-shim.sh](../bin/oracle-chrome-shim.sh) を主手段に昇格**（ラッパーが CHROME_PATH に自動設定）。実測 19.1s 完走・ウィンドウ非出現・残置なし。
3. **`browserModelLabel` 回避策は MCP では死んでいる**（当初の第一候補を棄却）: gpt-* モデル時は無視・非 gpt 文字列はファジー解決で gpt-5.2 に化ける（実測）。→ フォールバック案を昇格: config `modelStrategy: "ignore"`＋アカウント現在値（Sol×Extra High）。
4. **Google SSO の自動化ブラウザブロック**: 初回ログインで「ChatGPT はブロックされています」→ パスキー認証で突破（実測）。

## 消化 TODO

### A. oracle 側の構成（端末ローカル）

- [x] stale な chrome プロセスの掃除（07-09 の残置は自然消滅を確認。以後の全実走でも残置ゼロ）
- [x] `~/.oracle/config.json` 切替（バックアップ: `config.json.bak-20260711`）。最終形は上記変更点を反映し `manualLogin: true`・`modelStrategy: "ignore"`・`archiveConversations: "auto"` のみ（hideWindow/thinkingTime/copyProfileSource は置かない）
- [x] 一回限りの手動ログイン完了（Google SSO ブロック→パスキーで突破。専用プロファイルに永続を確認: `loggedIn: true`）

### B. 不可視の徹底

- [x] `hideWindow` 実測 → **不採用**（送信破壊。詳細は上記変更点2）
- [x] 画面外シム実測 → **採用・主手段へ昇格**（macOS のクランプ問題は発生せず）
- [x] `bin/oracle-chrome-shim.sh` 収容＋`./install.sh` 反映
- [x] （計画外）`bin/oracle-mcp-stable.sh` 新設: undici EINVAL ガード＋CHROME_PATH 自動設定＋`cli` サブコマンド
- [x] upstream issue 2件（オーナー承認済み・2026-07-11 起票）: [nodejs/undici#5544](https://github.com/nodejs/undici/issues/5544)（setTypeOfService 無ガード）／[steipete/oracle#312](https://github.com/steipete/oracle/issues/312)（hideWindow 送信破壊＋画面外配置の提案）

### C. GPT-5.6 呼び出し形

- [x] `browserModelLabel` 検証 → **機能しない実測**（棄却）
- [x] 採用形の確定: config `modelStrategy: "ignore"`＝アカウント現在値で走る。Effort 変更は per-call `browserThinkingTime`（新 UI メニュー読取の動作を実測済み）
- [x] preset `chatgpt-pro-heavy` 封印（解除条件は 06 に記載）

### D. ブラウザ後始末

- [x] 成功パス: 残置なし（実測）
- [x] 失敗パス: 残置なし（送信失敗 run・EINVAL クラッシュ run とも実測）

### E. Codex 親からの利用

- [x] `~/.codex/config.toml` の既存 oracle 登録をラッパーへ差し替え（バックアップ: `config.toml.bak-20260711-oracle`）
- [x] [05_codex-fragments.md](05_codex-fragments.md) に断片追記（§3b）
- [x] Codex 新セッションで oracle ツール疎通確認（2026-07-11 `codex exec` 新セッション実測: `oracle/consult` 呼出成功・modelStrategy=ignore・manualLogin=true）

### F. 還流（dotagents）

- [x] [06_oracle-mcp.md](06_oracle-mcp.md) 新設（実測反映済みの最終版）
- [x] `bin/agents-update.sh` に `'@steipete/oracle'` 追加
- [x] caveat 登録 5件・**public**（オーナー裁定 2026-07-11）: Cloudflare 壁／0.15.2 ラベル不整合／cookie 同期 Keychain 罠／undici EINVAL／hideWindow 送信破壊。repo ミラーへ収容済み（d61f464）
- [x] rag/ 還流（調査＋実測罠を追記済み）
- [x] [02_models.md](02_models.md) の oracle 行を実態に更新（2箇所）

### G. 検証（合格条件）

- [x] dryRun: MCP スモーク（ラッパー経由 stdio）で initialize/tools/consult-dryRun とも green・解決値 `modelStrategy: ignore`・`manualLogin: yes`
- [x] 実走: ガード＋シム経由 CLI で 19.1s 完走「VERIFIED-F GPT-5.6 Thinking」。**Keychain ポップアップなし・ウィンドウ非出現・残置なし**
- [x] MCP ライブ実走: 新セッションで確認済み（2026-07-11）。Claude=ラッパー経由 dryRun green→ライブ 21.7s「MCP-LIVE-OK GPT-5.6 Thinking」・Chrome 残置なし／Codex=`codex exec` 新セッションから dryRun 成功（両方ともラッパー `oracle-mcp-stable` 経由を実プロセスで確認）
- [x] `bash -n`・`make lint`・pathspec コミット

### やらないこと

- API engine / `OPENAI_API_KEY`（課金）
- 検知回避ブラウザ自作・逆行 API プロキシ（ToS 違反・BAN リスク）
- oracle 本体・フォーク改造（ガード・シムはすべて外付けラッパー）
- AppleScript デスクトップアプリ系への乗り換え
