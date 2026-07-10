# 01_project-layout —  全プロジェクト共通のフォルダ構成標準（P3 の正）

<!-- 前提: 2026-07-04 定義。NoveLore（~/Developer/Novel・GitHub forklore）の実測成熟形を一般化。適用判断は常に「見送り基準」を先に読む -->

## 開発ルート（オーナー裁定 2026-07-04）

- 開発ルートの標準は **`~/Developer`**（macOS・Linux・WSL2。ランブックの clone 先・sync-sweep の既定と同一）。
- ただし**既存端末の移設や例外はオーナーが端末ごとに裁定**する（FOX Windows native は `~/Documents/Program` のまま容認＝2026-07-04 オーナー裁定）。端末限定の裁定を本ファイルへ一般化して書かない。
- **基準パスの変更（プロジェクトの移動・改名・削除）はオーナーの明示承認必須**。実行前に目的・影響・戻し方を申告し、実行後に移動一覧を報告する（2026-07-04 の無申告移設事案より）。

## 標準化の方針（最初に読む）

- **Fable 級統括が在任する期間は、churn を恐れず標準へ寄せる**（オーナー指示 2026-07-04:「動くからやらない」は Fable 性能の浪費＝期間限定の最高知能で、動くものをさらに高品質にするのが本旨）。付属物の新設（rag/・CI・docs 連番正典・adr/・.claude/settings.json）は積極的に足す。
- **見送るのは「破壊的リスクが益を上回る」場合に限る**（リンク切れを生む大規模リネーム・稼働/デプロイパスを壊す移動・履歴を失う移動）。その場合も `git mv` で履歴保存・CI/デプロイのパス参照を同時追従・全ゲート green で回避できるなら実施する。「稼働に支障ないから触らない」は理由にしない。
- 実施の作法: **1リポ=独立コミット**・付属物新設→検証→統括レビュー→コミット・push。物量は Codex 委譲（レート非依存）、裁定とコミットは統括。
- 新規プロジェクトは最初からこの標準で作る。

## 必須要件（全型共通）

| 要素 | 内容 |
|---|---|
| `CLAUDE.md` | 正典（docs/00 等）への参照・検証コマンド・そのリポの掟。AI の入口 |
| `README.md` | 人間の入口（何ができるか・起動方法） |
| `docs/` | **00_ 番号順の正典**（00=overview から連番）＋ `adr/`（決定記録）＋ 監査ダイジェスト `audit-YYYY-MM/` ＋ **進行中プラン（docs/ に作り TODO を兼ねる。役目を終えた文書は `archive/` へ）**。命名: 正典=`NN_` 連番・小文字ケバブ／一時文書=`plan_`・`queue_` 接頭辞／archive 内=`YYYY-MM_` 接頭辞（dotagents/docs/adr/0004） |
| `rag/` | 調査・研究の再利用棚。`INDEX.md`（1行台帳）＋ `<topic>/raw/`（一次ソース）＋コンパイル記事。運用は dotagents/PLAN.md 原則10（還流・Lint・選球眼） |
| `.claude/settings.json` | 読み取り系 allowlist（fewer-permission-prompts で生成）。端末固有につき gitignore 対象なら生成手順を CLAUDE.md に書く |
| テスト＋CI | required チェックとして張る（無いリポで大きな作業を始めるなら最初に CI＝作業自体の安全網） |
| `.gitignore` 衛生 | `.env`・鍵・`.obsidian/`・`.venv/`・ビルド生成物。**gitignore された貴重物は push で保護されない**ことを常に意識（2026-07-04 実証事故: ローカル CLAUDE.md 消失） |
| `.codex-sidecar.yml` | sidecar 委譲を受けるリポはルートに置く（テンプレ: dotagents/docs/05_codex-fragments.md） |

## 知識基盤スタック（このリポ群の長期記憶の型）

1. **罠・実測教訓** → caveat（dotagents/caveat 経由で端末横断。記録前に caveat_search）
2. **外部仕様・研究** → `rag/`（markitdown 変換は**バイト数で成功判定**。JS ページは WebFetch/ブラウザ系）
3. **設計判断** → `docs/adr/`・監査ダイジェスト
4. **作法・手順** → CLAUDE.md（グローバル正本＋リポ別）
5. **進捗・状態** → プラン文書が TODO を兼ねる（docs/ 内。規約は dotagents/PLAN.md「文書の作法」）＋ issue

- 検索・理解の道具: **codegraph**（コード構造。MCP 登録は dotagents README ランブック）・caveat MCP・grep。
- 記法: `[[wikilink]]`＋YAML frontmatter（出典・取得日・確度）で **vault-friendly** に保つ。人間用の窓は Obsidian（真実は git+md のまま＝dotagents/PLAN.md 原則7）。

## 型別レイアウト

### A. pnpm モノレポ型（NoveLore 実測形。Web サービス・複数アプリ）

```
CLAUDE.md README.md docs/(00_..連番+adr/) rag/
apps/<app>/          … 実行体（web・mcp-server 等）
packages/<pkg>/      … 共有ライブラリ（core・db・schema 等。依存方向は packages→apps 禁止）
infra/               … デプロイ・IaC
pnpm-workspace.yaml tsconfig.base.json
```

### B. 単一パッケージ型（CLI・ライブラリ）

```
CLAUDE.md README.md docs/ rag/
src/  tests/  package.json（or pyproject 等）
```

### C. MCP サーバ型（aiterm-mcp・sprite-forge-mcp 系）

- B に加えて: README に **MCP 登録コマンドの確定記載**（scope 明示）・ツール一覧表・`server` エントリポイント明示。
- クライアント側の登録は dotagents README ランブックと二重定義しない（リンクする）。

### D. iOS 型（Kikoeru・nextflic 系）

- `<App>.xcodeproj|xcworkspace`・`<App>/`（ソース）・`<App>Tests/`・`fastlane/` 等は Xcode 慣習を優先し、**共通必須要件（CLAUDE.md/docs/rag/CI）だけを足す**。Xcode 標準と戦わない。

## ギャップ検査の手順（標準適用時）

1. リポごとに必須要件7点＋型判定を突き合わせ「欠落・過剰・移動候補・リスク」を採点（安価枠へ委譲可）。
2. 統括が移行順を裁定（見送り基準を先に適用）。
3. 適用は同期→標準化→CLAUDE.md 磨きを1リポで連続処理し、1リポ=独立コミット。
