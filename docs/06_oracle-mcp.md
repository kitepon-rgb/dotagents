# 06_oracle-mcp — ChatGPT Chat枠セカンドオピニオン（oracle）の常用ランブック

<!-- 前提: oracle 0.15.2・GPT-5.6 世代・Node 24/26 の undici バグ現存（2026-07 時点）。
     役割配置の正は docs/02_models.md。経緯と調査・切り分けの全記録は docs/plan_oracle-chat-quota.md → 完了後 archive -->

[oracle](https://github.com/steipete/oracle)（`@steipete/oracle`・npm -g）で ChatGPT サブスクの **Chat枠**を MCP 経由の第二意見に使う。Work枠（Codex 消費分）と別勘定・追加課金なし。**API engine / `OPENAI_API_KEY` は禁止**（憲法）。**oracle 本体は改造しない**——構成は config・起動ラッパー・呼び出し引数で行う。

## 設計の根拠（要旨・実測 2026-07-11）

- Chat枠を課金なしで叩く経路は Web UI 自動化のみ（公式プログラマティック経路なし）。
- **真のヘッドレスは Cloudflare が塞いでいる**（oracle 実装コメント・ChatGPT-Web2API README の独立一致）。検知回避ブラウザ自作は ToS 違反＝BAN リスクで不採用。
- 代替製品調査で oracle より上は現存せず（詳細: [rag/tools/chatgpt-chat-quota-mcp-survey.md](../rag/tools/chatgpt-chat-quota-mcp-survey.md)）。
- ただし素の oracle 0.15.2 には環境起因の地雷が3つあり、**全て外付けで無害化済み**（下記「入口は必ず oracle-mcp-stable」）。

## 入口は必ず `oracle-mcp-stable`（ラッパー経由）

正体: [bin/oracle-mcp-stable.sh](../bin/oracle-mcp-stable.sh) → `~/.local/bin/oracle-mcp-stable`。素の `oracle`/`oracle-mcp` を直接叩かない。ラッパーが握る地雷:

1. **Node undici の `setTypeOfService` EINVAL 即死**: undici が全 HTTP/1.1 リクエストで `socket.setTypeOfService(0)` を無条件に呼び（ガードなし）、macOS で特定ソケット状態だと未捕捉例外でプロセスごと死ぬ。Node 24.18.0 / 26.4.0 の両方で実測。MCP サーバーが「静かに接続クローズ」する事象の正体。→ ラッパーが `--import` の data: URL ガードで EINVAL を握って無害化（発動時 stderr に1回記録）。upstream 修正確認までの一時手段。
2. **`hideWindow`（Cmd-H）は使用禁止**: 非表示アプリは描画が止まり、**送信が発火せずプロンプトが下書きのまま滞留 → 後続 run の送信に混入する**（実測: 3 run 分のプロンプトが1メッセージで送信された）。不可視化は代わりに **画面外起動シム** [bin/oracle-chrome-shim.sh](../bin/oracle-chrome-shim.sh)（`--window-position=-32000,-32000`）で行う。ラッパーが `CHROME_PATH` に自動設定。描画は生きたままなので送信・検知が壊れない。実測 19 秒で完走・ウィンドウ非出現・プロセス残置なし。
3. **GPT-5.6 UI にモデルラベル照合が不追従**（preset/`browserModelLabel` とも 0.15.2 では機能しない。下記「呼び出しの標準形」）。

## セットアップ（新しい端末）

1. **導入**: `agents-update` の対象（`bin/agents-update.sh` PACKAGES に `@steipete/oracle`）。手動なら `npm install -g @steipete/oracle@latest`。`./install.sh` で `oracle-mcp-stable` / `oracle-chrome-shim` が `~/.local/bin` に入る。
2. **一回限りの手動ログイン**（オーナー操作・CLI 直打ちはこの用途のみ憲法許容）:

   ```bash
   ~/.local/bin/oracle-mcp-stable cli --engine browser --browser-manual-login \
     --browser-keep-browser --browser-input-timeout 300000 \
     --browser-model-strategy ignore -p "login check: reply with OK"
   ```

   開いた oracle 専用 Chrome（`~/.oracle/browser-profile`・実 Chrome と別物）でオーナーが ChatGPT にログイン。以後セッションは専用プロファイルに永続。
   **罠**: Google SSO は自動化フラグ付きブラウザを「安全でないブラウザ」として弾くことがある（「ChatGPT はブロックされています」表示）。パスキー認証で通るか、ダメなら ChatGPT ネイティブの**メールコードログイン**に切り替える（実測でパスキー成功）。
3. **config 正本を配置**（`~/.oracle/config.json`・バックアップしてから）:

   ```json
   {
     "browser": {
       "manualLogin": true,
       "modelStrategy": "ignore",
       "archiveConversations": "auto"
     }
   }
   ```

   - `manualLogin: true` … 専用プロファイル使用＝**Keychain アクセスゼロ・毎回認証の撲滅**
   - `copyProfileSource` は**置かない**（manual-login と排他。cookie 同期経路は Keychain 毎回認証＋不適用の罠）
   - `modelStrategy: "ignore"` … ピッカー操作を丸ごとスキップ（0.15.2 暫定。upstream 5.6 対応リリース後に `"select"` へ戻す）
   - `hideWindow` / `thinkingTime` は**置かない**（前者は送信破壊、後者はアカウント既定に委ねる）
4. **MCP 登録**:
   - Claude Code: `claude mcp add --scope user oracle -- /Users/kite/.local/bin/oracle-mcp-stable`
   - Codex: `~/.codex/config.toml` に（[05_codex-fragments.md](05_codex-fragments.md) の TOML 冪等適用手順で）:

     ```toml
     [mcp_servers.oracle]
     command = "/Users/kite/.local/bin/oracle-mcp-stable"
     ```

## 呼び出しの標準形（GPT-5.6 世代・0.15.2 時点）

**モデルと Effort は ChatGPT アカウントの現在値で走る**（現在: GPT-5.6 Sol系 × Effort Extra High。変更はオーナーが ChatGPT UI で行う）。0.15.2 の暫定仕様として以下は**全部封印**:

- preset `chatgpt-pro-heavy` — 旧 "Pro" ラベル照合で必ず失敗
- `browserModelLabel` — MCP 経路では gpt-* モデル時に無視され、非 gpt 文字列はファジー解決で別モデルに化ける（実測: "GPT-5.6 Sol" → gpt-5.2）
- `modelStrategy: "select"` — 同じラベル照合で失敗

標準形（MCP `consult`）:

```jsonc
{
  "prompt": "…",
  "engine": "browser",
  "files": ["src/**/*.ts"]          // 必要時
  // modelStrategy は config の "ignore" が効く。Effort を一時的に変えたい時だけ
  // "browserThinkingTime": "extra-high" 等を付ける（メニュー読取は新 UI 対応済みを実測）
}
```

- 事前確認は `dryRun: true`（Chrome に触らず解決構成を返す）。
- セッション確認は MCP `sessions` ツール（または `oracle-mcp-stable cli status`）。
- **解除条件**: upstream の 5.6 対応（issue #303/#305・PR #304/#306）が `agents-update` で入ったら、dryRun→実走で preset / select を再評価し、本ファイルを更新する。

## 後始末と健全性

- 正常・異常どちらのパスも Chrome は終了する（実測）。残置を疑ったら `pgrep -fl "browser-profile"`。
- 「送信失敗」エラー後は**下書き滞留に注意**: 次の run に前回プロンプトが混入し得る。混入を検知したら ChatGPT 側の該当会話（アーカイブ済み）を確認する。
- ガード発動は stderr の `[oracle-mcp-stable] setTypeOfService guard` 行で分かる（MCP ログに出る）。

## upstream への報告（起票済み・2026-07-11）

1. [nodejs/undici#5544](https://github.com/nodejs/undici/issues/5544): `writeH1` の `setTypeOfService` 無ガード呼び出しが macOS で未捕捉 EINVAL → プロセス死（try/catch 要望）。**解決したらラッパーの guard を外す**
2. [steipete/oracle#312](https://github.com/steipete/oracle/issues/312): `hideWindow` が新 ChatGPT UI で送信を壊す（画面外配置の採用提案）。**解決したらシムを外して本体機能へ戻す**
