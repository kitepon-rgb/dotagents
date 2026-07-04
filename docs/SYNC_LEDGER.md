# SYNC_LEDGER — 端末×リポの同期台帳と処遇（P2 の正）

各端末での掃引結果・処遇・最終確認日を記録する。掃引は `sync-sweep [dev-root]`（bin 収録）。処遇の承認は常にオーナー（H）。

## KaitonoMacBook-Air（走査ルート `~/Developer`・掃引 2026-07-04）

27 ディレクトリ＝ git 23 ＋ 非git 4。

### 同日実施済みの収容（2026-07-04・オーナー承認済み分）

- fast-forward pull（クリーンな behind のみ）: aiterm-mcp(-6)・codex-rc(-2)・dobojo(-1)・rpgdev(-2)・x-article-mcp(-2) → 全て origin と同期
- **push 3件（承認済み・実施済み）**: Novel main(+1)→forklore／codex-sidecar main(+2)／Kikoeru feat/listen-background を upstream 化
- **非git 処遇（承認済み・実施済み）**: ChromeDev（.vscode のみ）・grok（空）を目視確認のうえ削除／**ad-studio を git 化→ private repo 作成→ push 済み**（機微スキャン緑・main 正規化済み）／**blog-figmaker も git 化→ private repo 作成→ push 済み（2026-07-04 承認済。main で作成）**
- **OpenCClaw stash: オーナー裁定「放置」**（2026-07-04。削除はしない）
- git identity（noreply）と `init.defaultBranch main` をこの端末のグローバルに設定（ad-studio が master で生まれた実被弾を受けてランブックにも追記）
- dotagents は P0 最適化で終日収容済み（本台帳含む）

### 掃引結果（収容後の残課題のみ抜粋。全リポの生データは `sync-sweep` を再実行）

| リポ | 残課題 | 提案する処置 |
|---|---|---|
| Novel（=NoveLore。GitHub 名 **forklore**） | ~~main +1 未 push~~ push 済み（2026-07-04） | **⚠ 作業中ロック（オーナー宣言 2026-07-04）: 別セッションで稼働中。本作戦からは触らない。P5 等で着手する際は必ず事前にオーナーへ申告** |
| codex-sidecar | ~~main +2 未 push~~ | **push 済み（2026-07-04）** |
| Kikoeru | ~~feat/listen-background upstream 無し~~ | **branch push 済み（2026-07-04）**。.env は gitignore 内に実在（削除系操作時は要目視） |
| browser-to-api | ~~分岐 +1/-1~~ rebase 線形化→**push 済み（2026-07-04 承認済）** | 解消 |
| Throughline | ~~behind 3~~ pull 済み。`.agents/`（Throughline 端末状態）は未追跡のまま残置 | P5 再生時に .gitignore へ |
| WebAICoding | `.playwright-mcp/`（MCP 生成物）未追跡 | 無害・P5 再生時に .gitignore へ |
| tools-manager | ~~behind 1~~ 同期対象外の .DS_Store のみ→グローバル excludesfile で恒久抑止（2026-07-04） | 解消 |
| videomarketing | ~~価値物未収容＋外部フォーク~~ **解決（2026-07-04 オーナー裁定①）**: origin を kitepon-rgb/videomarketing（private・新設）へ切替、旧フォークは upstream として維持。rag/・tools-studio/ を収容し push 済み（機微スキャン緑・.venv 除外）。**罠踏破: shallow clone は新リモートへ push 不可**（remote unpack failed になる）→ `git fetch upstream --unshallow` で解決 | 解消 |
| codex-link | codex/mvp-host-pairing-flow は main より 5+ コミット先行・push 済み | **裁定: 迷いではなく現役の作業ブランチ**（main への統合はプロジェクト側の判断） |
| OpenCClaw | stash@{0}（CLAUDE.md 類・2026-05） | **オーナー裁定: 放置（2026-07-04）** |
| ServerManager | 既定ブランチ master | main 正規化（P5 tier1 の再生時に同時実施） |

### 非 git ディレクトリ（トリアージ対象）

| ディレクトリ | 実測 | 提案 |
|---|---|---|
| ad-studio | 実プロジェクト（直下18エントリ。DEPLOY.md/Dockerfile/docs 等） | **git 化して private push（承認待ち）** |
| blog-figmaker | 実プロジェクト（直下8エントリ。package.json/templates） | **git 化 or tar 退避（承認待ち）** |
| ChromeDev | 直下1エントリ（実質空。ls 可視ファイル無し） | 目視確認のうえ**削除候補（承認待ち）** |
| grok | 空ディレクトリ（0エントリ） | **削除候補（承認待ち）** |

### 終活トリアージ（ローカル 23 git リポ・**オーナー承認済み 2026-07-04**）

分類基準は PLAN P2（休眠＝端末単位の状態。ローカルが GitHub より古ければ「この端末では休眠」。プロジェクトの生死はオーナー宣言のみ）。

- **継続（21）**: dotagents・Novel(forklore)・Kikoeru・codex-sidecar・ServerManager・rpgdev・sprite-forge-mcp・aiterm-mcp・Caveat・Throughline・tools-manager・WebAICoding・browser-to-api・dobojo・nextflic・codex-link・**Chime・MMOAuction・Spotter・OpenCClaw・videomarketing**（後5つはオーナー明示: 休眠ではない。2026-07-04 修正指示）
- **この端末では休眠（2）**: codex-rc・x-article-mcp — 掃引時 behind のみ（-2/-2）でローカル作業痕なし。同期は維持、作業は主端末で
- **削除候補（ローカル 0）**: git リポには無し
- 注: P5 の監査優先順（tier1〜5）はこの分類と独立（tier5＝監査は必要時、であって休眠ではない）

### GitHub 側のみのリポ（ローカルに clone 無し・別途棚卸し対象）

`gh repo list` 上位で確認できた範囲: forklore(=Novel)・License-DB(+Backup)・OLTranslator・LiveTR・zenn-content（**archived 済み**）・Nextcloud・awesome-mcp-servers・ide-dashboard・entry・SelfLLMCreator・SessionHub・HomeAssistant・codex-link-p2p・stock-mcp・MotherMCP・patent-search-api・CursorHub・StableDiffusion・ai-group・Trader・ConnectC2X ほか。多くは他端末/サーバ運用 or 旧作。**GitHub 側の archive 提案は全端末の掃引が揃ってから**（この端末に無い＝不要、とは限らない）。

## ブラッシュアップ対象18リポ（この端末が主作業・オーナー確定 2026-07-04）

実行順序③でこの端末が標準化する。他端末は触らない（docs/OTHER_TERMINAL_KICKOFF.md）。
sprite-forge-mcp / codex-sidecar / ServerManager（master→main も）/ MMOAuction / OpenCClaw / Caveat / WebAICoding / browser-to-api / videomarketing / nextflic / Chime / Spotter / aiterm-mcp / rpgdev / dotagents / dobojo / Throughline / Novel(forklore)
除外: Kikoeru（別セッション）・codex-link（現役ブランチ・問答無用で対象外）・codex-rc/x-article-mcp（この端末では休眠）。

## FOX — Windows 11 native（走査ルート `~/Documents/Program`・掃引 2026-07-04）

42 ディレクトリ＝ git 29 ＋ 非git 13。同一筐体の WSL2 側とは別環境（WSL 側は同日 own 125件を収容済み）。

### 特記事項（この端末の構造ブロッカーと修正提案）

- ~~**symlink 不可＝install.sh 未実施**~~ **解消（2026-07-04 同日）**: オーナーが開発者モードを ON → §2 退避（~/Archives/pre-dotagents-20260704/ へ移動）→ `MSYS=winsymlinks:nativestrict ./install.sh` → **verify-install OK**。この端末の工場展開完了（罠は caveat/entries/windows/ に収容済み）。
- dotagents の clone パスが `~/Documents/Program/dotagents`（標準 `~/Developer/dotagents` と不一致）。移設か Windows 例外かはオーナー裁定待ち。
- **sync-sweep.sh 修正提案（MacBook 向け）**: Windows では `hostname -s` が失敗し台帳タイトルのホスト名が空になる（GNU 非互換）。`hostname -s 2>/dev/null || hostname` へ。**install.sh 修正提案**: MSYS 環境では冒頭で `export MSYS=winsymlinks:nativestrict`（無指定だと ln -s がコピーになり正本化が静かに不成立）。README の自動アップデート検証も実ログは `Finished` でなく `agents-update end` 行。

### 同日実施済みの収容

- **罠DB**: own 86件のうち FOX(Windows) 固有 1件（aiterm grok_agent の Windows/WSL2 罠）を caveat/ へ push。残り85件は WSL 側収容分と内容同一（mode 差のみ）＝重複回避。旧同期リポ **caveats-quo は GitHub 側消滅済み・全35件が dotagents 収容済みであることを照合確認**。
- git identity は設定済みを確認、`init.defaultBranch main` を新規設定。
- **週次自動更新 agents-update を常設**（タスクスケジューラ・毎週月曜12:00・未起動時は起動後追い掛け）。実走行で 12 パッケージ全 latest 化を確認（codex-sidecar 3点・SDK・pnpm はこの実行で新規導入）。旧 `SmartClaude-UpdateTools` タスクは **npm 更新ではなく RTK 本体＋Claude プラグインの更新専用**（PCManager/update-tools.ps1）で agents-update と重複しないため**残置**（XML は ~/Archives へバックアップ済み。将来 agents-update へ統合するかは裁定待ち）。
- **codex-sidecar MCP をユーザースコープ登録**（node 絶対パス起動・Connected 確認）。対話=aiterm／非対話=codex-sidecar の委譲両輪がこの端末で有効。
- メモリ整理 P4: 25プロジェクト・216ファイルへ bulk-curation 完了（tar バックアップ→sonnet 並列委譲・25/25 エラー0）。機械修復6件適用。**flags は [P4_FLAGS_FOX.md](P4_FLAGS_FOX.md) に集約（🔴機密2件を含む・オーナー裁定待ち）**。

### 18リポ該当分（触らない・状態記録のみ）

aiterm-mcp(-19)・ServerManager(-17)・Spotter(-59)・Throughline(-55)・Caveat(-39・dirty1=excalidraw.log)・rpgdev(-7・dirty1=package-lock.json)・dotagents(本作業)。いずれも behind はあるが MacBook 主作業のため放置。

### git リポの処遇提案（オーナー承認待ち）

| リポ | 実測 | 提案 |
|---|---|---|
| HIT Auction System | **dirty 118（実変更M多数）＋stash 1**・最終コミット 2026-05-02 | **要意図確認**（未収容の実作業が眠っている可能性大。収容 or 破棄の裁定を） |
| SelfLLMCreator | 未追跡18（CLAUDE.md・playbook 群） | 収容 or 破棄の裁定待ち |
| Trader | 未追跡 tmp diff 群＋`master` ブランチ upstream 無 | 収容 or 破棄＋迷いブランチ裁定 |
| LiveTR | **master 上で作業（既定は main）**＋再現スクリプト2件未追跡（2026-06-24） | ブランチ正規化＋収容の裁定 |
| OLTranslator | `feat/telemetry-bughub-4level` upstream 無 | push して upstream 化の承認待ち |
| IP | 既定 master・未追跡1（比較レポート） | main 正規化は P5 時。ドキュメント収容裁定 |
| DDNSer / LicenseServer / ai-group | dirty は全てノイズ（.claude/ .vscode/ excalidraw.log） | P5 標準化時に gitignore へ（この端末では触らず） |
| everything-claude-code | 外部OSS参照clone・-935 behind・改変なし | **削除候補**（必要時に再clone） |
| caveats-quo | 旧罠DB同期リポ・**リモート消滅・全35件収容済み確認** | **削除候補** |
| 休眠（behind/同期・クリーン） | ConnectC2X(-6)・HomeAssitant(-3)・IP-MCP(-5)・Relay(-12)・Web(-65)・SmartClaude(枝 smartclaude・同期)・Nextcloud・QuoLabo・Zenn・personaplex・claude-image-tools(-1) | 同期維持・作業は主端末で |

### 非 git ディレクトリ（トリアージ対象・承認待ち）

| ディレクトリ | 実測 | 提案 |
|---|---|---|
| GrokCLI・YomiAGE | 空 | **削除候補** |
| _playwright | 生成物26件（スクショ・モック） | **削除候補** |
| BosTimerBot(8)・Translator(3) | 小型bot実体。**BosTimerBot に credentials.json＝機微** | git化(private) or tar退避 |
| VoiceTransrator(14)・ai-companion(6) | 実プロジェクト（エンジン・DB 含む） | git化 or tar退避 |
| Lisence(25) | 手順書群（License-DB 系？） | 関連リポへ収容 or tar退避 |
| PCManager(8) | 端末管理スクリプト（update-tools.ps1 は現役タスクが参照） | git化候補（現役のため削除不可） |
| GroupChat(2)・Claude(1)・FileCopy(1) | 小物 | 目視裁定待ち |

## FOX — WSL2 Ubuntu-26.04（走査ルート `~/Developer`・掃引 2026-07-04）

77 ディレクトリ＝ git 60 ＋ 非git 17。同一筐体の Windows native 側とは別環境（上記セクション参照）。

### 開発ルート統一（同日実施・オーナー承認済み）

- **`~/projects` → `~/Developer` へ全 76 エントリを mv で移設**（同一 ext4 内 rename＝損失ゼロ。移設前後の sync-sweep が dirty 数・branch・stash まで完全一致することを照合済み）。
- 経緯: 先行セッションが README ランブック準拠で dotagents のみ無申告で移設→オーナー激怒→「全量統一なら可」の裁定を受け残り 75 を移設。**基準パス変更の無断実施は再発防止対象（PROJECT_LAYOUT.md 開発ルート節）**。
- 旧 `~/projects` は空＋`MOVED.md` のみ残置（**削除はオーナー承認待ち**。Windows 側 `\\wsl.localhost\...\projects` 参照の付け替え猶予）。バックアップ一式は `~/migration-backup-20260704/`。
- 参照張り替え済み: `.claude.json`・`.codex/config.toml`（パス焼き込み全置換・JSON 検証済）／端末メモリ 24 キー改名（旧 dotagents 分はセッションログ統合）／npm link `b2a-cli` を新パスへ／`~/.local/bin/delegate` 残骸 symlink 除去（機能自体 v0.7.0 で撤去済み）。壊れ symlink 走査ゼロ・verify-install OK。

### 同日実施済みの収容（WSL 側）

- **週次自動更新**: crontab に `agents-update` 常設済みを確認（毎週月曜 12:00・旧 npm 行なし）。実走行 12/12 パッケージ latest 化・FAILED 0（ログ末尾 `agents-update end` 確認）。
- **codex-sidecar-cli/core の npm link は registry 版へ置換**（agents-update 実走行による。正典の registry 運用追認どおり。link 開発へ戻す判断は PENDING_OWNER 既存項目）。
- 罠DB: own 125 件収容済み（先行セッション・eeee3cd 以前）。

### 18リポ該当分（WSL 側・触らない・状態記録のみ）

Caveat(-4・dirty3)・Chime(-5)・Spotter(-2)・sprite-forge-mcp(-3)・codex-sidecar(-2)・browser-to-api(-2)・WebAICoding(-22・dirty1)・MMOAuction(dirty1)・ServerManager(-1・dirty1・master)・OpenCClaw(-1)・dotagents(本作業)・dobojo/rpgdev/Throughline(同期)。behind は MacBook 主作業のため放置。

### 処遇提案（オーナー承認待ち）

| 対象 | 実測 | 提案 |
|---|---|---|
| dirty 残り9リポ（18リポ外） | DDNSer(1)・FlaUI-MCP(1)・IP-MCP(1)・License-DB(2)・LiveTR(1)・Trader(1)・ai-group(1)・claude-image-tools(1)・personaplex(1) | 各1〜2ファイル＝収容 or 破棄の目視裁定（次セッションで中身一覧を出す） |
| 迷いブランチ | codex-rc `rollback-backup/pre-24h-20260509`（upstream無）・terminal `feat/node-impl-tests-publish`（upstream無） | push して upstream 化 or 削除の裁定 |
| 外部 clone・大幅 behind | llama.cpp(-872)・ComfyUI(-420)・claude-usage(-98)・zenn-content(-34)・OLTranslator(-16)・Nextcloud(-2) | 同期維持 or 削除（必要時再clone）の裁定 |
| caveats-quo | **リモート消滅**（fetch 失敗の正体。Windows 側で全35件収容済み確認済み） | **削除候補**（Windows 側提案と同一） |
| 非git 17件 | 実体系: Lisence(25)・ImageCollector(18)・StableDiffusion(17)・VoiceTransrator(13)・sfc2win(10)・git-manager(10)・AlwaysToGo(7)・BosTimerBot(7)・_playwright(5)・ai-companion(5)・nasne(4)・Translator(3)・GroupChat(2)／小物: Claude(1)・FileCopy(1)・YomiAGE(1)・test(1) | git化(private)/tar退避/削除の裁定（Windows 側と同名多数＝同系の重複面。横断で一括裁定推奨） |
| Windows アプリ専用プロジェクト | オーナー指示 2026-07-04「WSL2 環境では完全に Windows アプリのものは不要＝削除可」（**この端末限定の裁定**） | 証拠付きで分類し WSL 側から削除（現役 MCP 実体の FlaUI-MCP・Mcp.ComputerUse は保全。実施結果は本節へ追記） |

## 他端末（未掃引）

- 端末追加時: README ランブック → `sync-sweep` → 本ファイルにセクション追記 → トリアージ承認（端末ごとに取る）
