# SYNC_LEDGER — 端末×リポの同期台帳と処遇（P2 の正）

各端末での掃引結果・処遇・最終確認日を記録する。掃引は `sync-sweep [dev-root]`（bin 収録）。処遇の承認は常にオーナー（H）。

## KaitonoMacBook-Air（走査ルート `~/Developer`・掃引 2026-07-04）

27 ディレクトリ＝ git 23 ＋ 非git 4。

### 同日実施済みの収容（2026-07-04・オーナー承認済み分）

- fast-forward pull（クリーンな behind のみ）: aiterm-mcp(-6)・codex-rc(-2)・dobojo(-1)・rpgdev(-2)・x-article-mcp(-2) → 全て origin と同期
- **push 3件（承認済み・実施済み）**: Novel main(+1)→forklore／codex-sidecar main(+2)／Kikoeru feat/listen-background を upstream 化
- **非git 処遇（承認済み・実施済み）**: ChromeDev（.vscode のみ）・grok（空）を目視確認のうえ削除／**ad-studio を git 化→ private repo 作成→ push 済み**（機微スキャン緑・main 正規化済み）／blog-figmaker を git 化（ローカル commit まで。remote 作成は未=承認文言の範囲外につき保留提案）
- **OpenCClaw stash: オーナー裁定「放置」**（2026-07-04。削除はしない）
- git identity（noreply）と `init.defaultBranch main` をこの端末のグローバルに設定（ad-studio が master で生まれた実被弾を受けてランブックにも追記）
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

### 終活トリアージ（ローカル 23 git リポ・**オーナー承認済み 2026-07-04**）

分類基準は PLAN P2（休眠＝端末単位の状態。ローカルが GitHub より古ければ「この端末では休眠」。プロジェクトの生死はオーナー宣言のみ）。

- **継続（21）**: dotagents・Novel(forklore)・Kikoeru・codex-sidecar・ServerManager・rpgdev・sprite-forge-mcp・aiterm-mcp・Caveat・Throughline・tools-manager・WebAICoding・browser-to-api・dobojo・nextflic・codex-link・**Chime・MMOAuction・Spotter・OpenCClaw・videomarketing**（後5つはオーナー明示: 休眠ではない。2026-07-04 修正指示）
- **この端末では休眠（2）**: codex-rc・x-article-mcp — 掃引時 behind のみ（-2/-2）でローカル作業痕なし。同期は維持、作業は主端末で
- **削除候補（ローカル 0）**: git リポには無し
- 注: P5 の監査優先順（tier1〜5）はこの分類と独立（tier5＝監査は必要時、であって休眠ではない）

### GitHub 側のみのリポ（ローカルに clone 無し・別途棚卸し対象）

`gh repo list` 上位で確認できた範囲: forklore(=Novel)・License-DB(+Backup)・OLTranslator・LiveTR・zenn-content（**archived 済み**）・Nextcloud・awesome-mcp-servers・ide-dashboard・entry・SelfLLMCreator・SessionHub・HomeAssistant・codex-link-p2p・stock-mcp・MotherMCP・patent-search-api・CursorHub・StableDiffusion・ai-group・Trader・ConnectC2X ほか。多くは他端末/サーバ運用 or 旧作。**GitHub 側の archive 提案は全端末の掃引が揃ってから**（この端末に無い＝不要、とは限らない）。

## 他端末（未掃引）

- 端末追加時: README ランブック → `sync-sweep` → 本ファイルにセクション追記 → トリアージ承認（端末ごとに取る）
