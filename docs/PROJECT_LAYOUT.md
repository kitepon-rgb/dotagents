# PROJECT_LAYOUT.md — 全プロジェクト共通のフォルダ構成標準（P3 の正）

<!-- 前提: 2026-07-04 定義。NoveLore（~/Developer/Novel・GitHub forklore）の実測成熟形を一般化。適用判断は常に「見送り基準」を先に読む -->

## 見送り基準（最初に読む——標準は目的でなく手段）

- **稼働に支障のない綺麗事だけの移動はしない**（churn > 益）。標準との差分があっても、それが事故・迷子・重複調査を生んでいないなら移行しない。
- 移行するなら: `git mv` で履歴保存・CI/デプロイのパス参照を同時追従・**1リポ=1PR**・全ゲート green を確認してからマージ。
- 新規プロジェクトは最初からこの標準で作る（移行コストゼロの唯一のタイミング）。

## 必須要件（全型共通）

| 要素 | 内容 |
|---|---|
| `CLAUDE.md` | 正典（docs/00 等）への参照・検証コマンド・そのリポの掟。AI の入口 |
| `README.md` | 人間の入口（何ができるか・起動方法） |
| `docs/` | **00_ 番号順の正典**（00=overview から連番）＋ `adr/`（決定記録）＋ 監査ダイジェスト `audit-YYYY-MM/` |
| `rag/` | 調査・研究の再利用棚。`INDEX.md`（1行台帳）＋ `<topic>/raw/`（一次ソース）＋コンパイル記事。運用は dotagents/PLAN.md 原則10（還流・Lint・選球眼） |
| `.claude/settings.json` | 読み取り系 allowlist（fewer-permission-prompts で生成）。端末固有につき gitignore 対象なら生成手順を CLAUDE.md に書く |
| テスト＋CI | required チェックとして張る（無いリポで大きな作業を始めるなら最初に CI＝PLAN の作法） |
| `.gitignore` 衛生 | `.env`・鍵・`.obsidian/`・`.venv/`・ビルド生成物。**gitignore された貴重物は push で保護されない**ことを常に意識（P2 の実証事故） |

## 知識基盤スタック（このリポ群の長期記憶の型）

1. **罠・実測教訓** → caveat（dotagents/caveat 経由で端末横断。記録前に caveat_search）
2. **外部仕様・研究** → `rag/`（markitdown 変換は**バイト数で成功判定**。JS ページは WebFetch/ブラウザ系）
3. **設計判断** → `docs/adr/`・監査ダイジェスト
4. **作法・手順** → CLAUDE.md（グローバル正本＋リポ別）
5. **進捗・状態** → リポの TODO/issue（dotagents は docs/TODO.md）

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

## ギャップ検査の手順（P3 適用時）

1. リポごとに必須要件7点＋型判定を突き合わせ「欠落・過剰・移動候補・リスク」を採点（A 委譲可）。
2. 統括が移行順を裁定（見送り基準を先に適用）。
3. 適用は P5 再生と同じ波で（同期→標準化→監査→リファクタを1リポで連続処理）。
