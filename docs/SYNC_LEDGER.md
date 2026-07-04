# SYNC_LEDGER — 端末×リポの同期台帳と処遇（P2 の正）

各端末での掃引結果・処遇・最終確認日を記録する。掃引は `sync-sweep [dev-root]`（bin 収録）。処遇の承認は常にオーナー（H）。

## KaitonoMacBook-Air（走査ルート `~/Developer`・掃引 2026-07-04）

27 ディレクトリ＝ git 23 ＋ 非git 4。

### 同日実施済みの収容（安全操作のみ）

- fast-forward pull（クリーンな behind のみ）: aiterm-mcp(-6)・codex-rc(-2)・dobojo(-1)・rpgdev(-2)・x-article-mcp(-2) → 全て origin と同期
- dotagents は P0 最適化で終日収容済み（本台帳含む）

### 掃引結果（収容後の残課題のみ抜粋。全リポの生データは `sync-sweep` を再実行）

| リポ | 残課題 | 提案する処置 |
|---|---|---|
| Novel（=NoveLore。GitHub 名 **forklore**） | main +1 未 push（完成 feature コミット） | **push（承認待ち）** |
| codex-sidecar | main +2 未 push（内容は origin/feat/generate として push 済み＝main の公開のみ） | **push（承認待ち）** |
| Kikoeru | feat/listen-background が upstream 無し | **branch push（承認待ち）**・.env は gitignore 内に実在（削除系操作時は要目視） |
| browser-to-api | main が分岐 +1/-1 | fetch 済み。両コミットの内容を見て merge/rebase を裁定（F・未実施） |
| Throughline | behind 3 ＋ dirty 1 | dirty の意図確認→収容してから pull（F・未実施） |
| WebAICoding / tools-manager | dirty 1（tools-manager は behind 1 も） | dirty の意図確認→収容（F・未実施） |
| videomarketing | dirty 2 ＋ remote が外部フォーク（digitalsamba/claude-code-video-toolkit） | 自リポへ切り替えるか**オーナー判断（H）** |
| codex-link | 迷いブランチ codex/mvp-host-pairing-flow に滞在（main と差なし） | main へ戻すか継続作業ブランチとして明示（F） |
| OpenCClaw | stash@{0} に CLAUDE.md 類の未収容編集（2026-05） | `git stash branch` でブランチ化→収容（承認待ち） |
| ServerManager | 既定ブランチ master | main 正規化（P5 tier1 の再生時に同時実施） |

### 非 git ディレクトリ（トリアージ対象）

| ディレクトリ | 実測 | 提案 |
|---|---|---|
| ad-studio | 実プロジェクト（直下18エントリ。DEPLOY.md/Dockerfile/docs 等） | **git 化して private push（承認待ち）** |
| blog-figmaker | 実プロジェクト（直下8エントリ。package.json/templates） | **git 化 or tar 退避（承認待ち）** |
| ChromeDev | 直下1エントリ（実質空。ls 可視ファイル無し） | 目視確認のうえ**削除候補（承認待ち）** |
| grok | 空ディレクトリ（0エントリ） | **削除候補（承認待ち）** |

### 終活トリアージ仮分類（ローカル 23 git リポ・オーナー承認待ち）

- **継続（16）**: dotagents・Novel(forklore)・Kikoeru・codex-sidecar・ServerManager・rpgdev・sprite-forge-mcp・aiterm-mcp・Caveat・Throughline・tools-manager・WebAICoding・browser-to-api・dobojo・nextflic・codex-link — PLAN P5 tier1〜4＋開発基盤＋ハブ
- **休眠候補（7）**: Chime・MMOAuction・Spotter・OpenCClaw・codex-rc・x-article-mcp・videomarketing — PLAN P5 tier5（同期と CLAUDE.md だけ先行、監査は必要時）。ローカル削除はせず GitHub と同期状態を維持
- **削除候補（ローカル 0）**: git リポには無し（全て remote あり・上記収容で同期見込み）

### GitHub 側のみのリポ（ローカルに clone 無し・別途棚卸し対象）

`gh repo list` 上位で確認できた範囲: forklore(=Novel)・License-DB(+Backup)・OLTranslator・LiveTR・zenn-content（**archived 済み**）・Nextcloud・awesome-mcp-servers・ide-dashboard・entry・SelfLLMCreator・SessionHub・HomeAssistant・codex-link-p2p・stock-mcp・MotherMCP・patent-search-api・CursorHub・StableDiffusion・ai-group・Trader・ConnectC2X ほか。多くは他端末/サーバ運用 or 旧作。**GitHub 側の archive 提案は全端末の掃引が揃ってから**（この端末に無い＝不要、とは限らない）。

## 他端末（未掃引）

- 端末追加時: README ランブック → `sync-sweep` → 本ファイルにセクション追記 → トリアージ承認（端末ごとに取る）
