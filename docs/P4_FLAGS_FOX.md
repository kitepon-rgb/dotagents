# P4 メモリ整理 flags — FOX(Windows)（2026-07-04・オーナー裁定待ち）

bulk-curation（25 プロジェクト・216 ファイル・sonnet 並列委譲・エラー0）の flags_for_owner を裁定用に集約。
機械修復済み: HIT の索引3行追記／Spotter の索引1行追記／ServerManager の相対日付2件を絶対化。他は「整合済み・修復不要」を確認。
バックアップ: `~/Archives/claude-memories-pre-curation-20260704.tar.gz`。

## 🔴 機密（最優先・実値はここに書かない。各メモリファイルを直接見て判断を）

1. **Google の緊急バックアップコードが平文でメモリに保存**: `projects/c--Users-kite--Documents-Program-HIT-Auction-System/memory/reference_google_backup.md`。意図的なら対応不要、そうでなければ削除＋コード無効化を。
2. **Nextcloud の DB パスワードが平文でメモリに保存**: `projects/c--Users-kite--Documents-Program-Web/memory/reference_nextcloud_permissions.md`。内容自体は復旧用の構成記録として価値あり＝昇格候補でもある。ローテーション＋秘匿化の判断を。

## 孤児メモリ（プロジェクト実体がこの端末に無い。削除/退避/存続の裁定を）

| メモリ | 状況 |
|---|---|
| OpenClaw（38ファイル） | 実体は 2026-06-27 に本PCから完全撤去済み（PCManager メモリに撤去記録あり）。汎用的な罠 5件は下記昇格候補に抽出済み |
| spotter-workdir | `~/spotter-workdir` 消滅。テレメトリ改修計画（file:line 付き）が実装計画級 → Spotter リポへの昇格判断を |
| throughline-haiku-workdir | 実体消滅。caveat-cli の pre-commit 仕様・検証手順が眠っている |
| ImageCollector | 実体消滅。設計判断の記録のみ |
| SmartCompact | GitHub 側は **Throughline にリネーム済み**（自動リダイレクト確認）。メモリの言語/フォールバック方針は Throughline へ昇格候補 |

## 昇格候補（メモリ→リポ正典へ。P5 の各リポ再生時に同時実施が原則）

- **ConnectC2X**: Node.js 22 のグローバル例外ハンドラ未設定でサイレス落ちする罠（commit cdfaf37 で修正済みだが CLAUDE.md 未収載）
- **LiveTR**: ヘッドレス環境で cmd が build.bat の日本語行で壊れる罠＋PowerShell 直駆動の回避策（メモリにしか無い）。ほか CLAUDE.md 側の陳腐化 2件（memory/ 参照の空振り・インストーラサイズ）
- **OLTranslator**: BugHub resolve API へ日本語 note を curl すると Shift-JIS 化で JSON が壊れる罠（リポ未収載）
- **OpenClaw 由来の汎用知見 5件**: ①Claude CLI stream-json の result 空文字罠 ②enterprise MCP 自動接続は CONFIG_DIR 分離で遮断不可 ③fire-and-forget の silent 401 防止 ④env 検証のモード別分離原則 ⑤並行 Claude の「修復完了」4点検証手順 → caveat / rules へ
- **Throughline**: `gh release create` で過去版を作ると Latest が剥がれる罠＋再固定手順 → **polish-github スキルへ追記**（実事故あり・スキル側は手順が不完全）
- **IP**: 「比較・評価で自社有利バイアスをかけない」ルール（CLAUDE.md 未収載）
- **PCManager**: OpenClaw 撤去の経緯と Bellbot 存続の運用判断が CLAUDE.md 未収載
- **Spotter**: ツールカタログ `equivalent_via` 設計課題（未実装の生きた宿題）・Haiku セッション戦略の反転履歴
- **X API の料金/認証一次情報**（OpenClaw メモリ内）→ caveat へ

## 陳腐化・食い違い（内容書換は契約外だったため未修正。次に触る時に更新を）

- **ServerManager**: サーバーは Bazzite→Ubuntu(MS-A2) 移行済みなのにメモリ4件が旧構成のまま（server_info・network_bridge・sm-parent・Pi5 stage1）。AI 運用主体も Codex へ移管済み
- **HomeAssitant**: 索引の一行要約が旧構成（Bazzite/Podman）のまま。openclaw 再起動手順 2件が podman コマンドのまま（実体は docker）
- **SmartClaude**: Sprint 5/6/7 完了済みなのに「未着手」のまま。watcher hook は settings.json から消えている。Dashboard port 8080→52740
- **Relay**: 「refresh なし」→ 実装は refresh token 対応済み。ツール数の表記ゆれ
- **LicenseServer**: メモリ 2026-03-09 のまま実体は 06-19/20 更新（3ヶ月差）
- **Web**: auctionbot の Vercel URL が 404
- **claude-image-tools**: メモリ/README ともローカル登録前提だが、実際は image-hub(HTTP) へ移行済みで**しかも 3 サーバとも接続不可（サーバ死亡中）**。移行コミット記録なし。復旧 or 文書更新の判断を
- **SelfLLMCreator**: メモリの MEMORY.md がリポ直下の MEMORY.md と**ハードリンクで同一実体**（意図か手違いか判断を）
- **dotagents(FOX)**: grok メモリの caveat ID 表記が `claude-code/` プレフィックス付きで検索と不一致 → 端末側で修正済み（2026-07-04）

## その他

- OpenClaw の user_job/user_lifestyle に本業情報が部分重複（完全一致でないため未統合。1本化の要否）
- Spotter の session_keyword.md（カナリア的ファイル）の要否
- Trader feedback_listen_first: 具体例の対象実装は CMA-ES 置換済み（教訓自体は有効）
