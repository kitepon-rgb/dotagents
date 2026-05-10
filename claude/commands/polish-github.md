---
description: GitHub OSS の見栄え（メタデータ / README / Release / 画像 / 図 / CI バッジ）を整える。最初に監査だけして選択肢を提示し、ユーザーの GO 後に着手。
---

このリポジトリの GitHub 上の見栄えを整え、最初の訪問者が「何で何が嬉しいか」を 5 秒で掴めるようにする。

## 進め方

最初に **現状監査** だけ実行し、結果と「何を直すか」の選択肢を効果 / コスト表でユーザーに提示する。
ユーザーが GO サインを出してから着手する。「全部やれ」と来たらまとめて進めて良い。
不可逆操作（push / Release 作成 / repo 設定変更 / tag push / Settings 書き換え）は事前に一言告知してから実行。

## 監査でチェックすること

### 1. GitHub 側のメタデータ

```sh
gh repo view --json description,homepageUrl,repositoryTopics,latestRelease,hasDiscussionsEnabled,openGraphImageUrl,usesCustomOpenGraphImage
```

- `description` が古いバージョンの説明で止まっていないか
- `topics` が付いているか（最低 8〜13 個推奨、検索流入のため）
- `homepageUrl` が空欄でないか（npm / docs サイト / デモ等）
- `latestRelease` の tag が実装の最新と乖離していないか
- Custom OG image があるか（無ければ作成提案）
- Discussions が有効か

### 2. README の構造

- 冒頭が長文ステータス段落で始まっていないか（5 秒で掴める 1 行 pitch があるか）
- 「30 秒で何ができるか」の使用例があるか
- 競合との比較表（似たツール / 既存手段との差分）があるか
- 主作者の母語に応じた多言語版（例: `README.ja.md` / `README.zh.md`）があるか
- 過去のバージョン履歴やレガシーな長文が hero を圧迫していないか（折りたたむべきか）

### 3. README 内の図

- アーキテクチャ図 / フロー図 / 概念図があるか
- 構造を文章だけで長く説明している箇所が冒頭にあれば、図化候補

### 4. プロジェクトの性格（画像戦略の前提）

監査時にユーザーに 1 問確認するか、README とコードベースから推定する:

| 区分 | 例（一般的に該当しがちな領域） | 画像戦略の方向性 |
|---|---|---|
| A. 硬派 / 開発者向け CLI / 実用ツール | grep 系、ファイル操作、ビルドツール、git ヘルパ | hero 1 枚 + アーキ図、装飾は控えめ。情報優先 |
| B. プロダクト / アプリ系 | dashboard, web app, SaaS OSS, デスクトップアプリ | hero 凝る + スクショ多め、機能アイコン可 |
| C. ライブラリ / フレームワーク | UI ライブラリ、ORM、Web フレームワーク | ロゴ + ベンチマーク図、ブランディング強め |
| D. 創造系 / アート / クリエイティブツール | generative art、デザインツール、ゲーム系 | 派手 OK、ビジュアル主導 |

性格に対して画像が過剰だと「中身より見せ方」と読まれて逆効果、控えめ過ぎると「メンテされてない」と読まれる。**マッチさせる**。これは押し付けではなく判断材料として提示する。

### 5. CI バッジ / 実行状態

README に CI バッジがあって status が failing なら監査対象に含める。
`gh run list --limit 5` で直近の状態を確認。

### 6. CHANGELOG / git tag / GitHub Release の整合性

```sh
git tag --sort=-v:refname
gh release list --limit 20
git log --oneline -30
```

これらを突き合わせ、tag があるのに Release が無いバージョン、CHANGELOG にあるのに tag が無いバージョンを洗い出す。

## 監査後にユーザーに出す提示形式

軸ごとに表で出し、推奨順をつける。例:

| 軸 | 効果 | コスト | 内容 |
|---|---|---|---|
| A. メタデータ修正 | 中 | 小 | description / topics / homepage / Discussions |
| B. Release 追いつき | 中 | 小 | 未 release の tag に GitHub Release を作成、CHANGELOG から notes 流用 |
| C. README hero 刷新 | 大 | 中 | 1 行 pitch + 30 秒使用例 + 比較表、長文は `<details>` で折りたたみ |
| D. 多言語 README | 中 | 中 | 主作者の言語版 README、相互リンク |
| E. OG バナー（共有時の絵） | 大 | 小〜中 | 1280x640 PNG、性格に合わせた密度 |
| F. README hero 画像 | 中 | 小〜中 | OG とトーンを揃えた縦横自由のビジュアル |
| G. アーキ図 / フロー図 | 中 | 小 | 構造を 1 枚で伝える |
| H. CI 緑化 | 小〜中 | 案件次第 | 失敗 job を root cause 特定して直す。元から壊れてた既存問題は別タスク扱い |

ユーザーに「どこから着手するか」を聞く。「全部やれ」「A+B だけ」等の指示を待つ。

## 画像生成ツールの役割分担（汎用ガイド）

環境に応じて利用可能なツールが違う前提で、**第一選択 / 補助 / fallback** を併記する。AI 画像生成 MCP（OpenAI gpt-image, Google Imagen, etc.）が使えるなら **OG / README hero は AI 生成を第一選択**。日本語などのテキストを画像内に焼き込む案件で特に効く。

| 用途 | 第一選択 | 補助 / 代替 | fallback（ツール無し） |
|---|---|---|---|
| OG バナー（テキスト主体、1280x640 PNG） | AI 画像生成 MCP（gpt-image 系はタイポ強い） | ポスター系 Skill（レイアウト品質）、画像編集ツール | SVG を `.github/og.svg` に手書き |
| README hero 画像 | AI 画像生成 MCP | ポスター系 Skill | SVG / PNG 既存素材 |
| 抽象背景パターン | 生成アート Skill (p5.js 等) | AI 画像生成 MCP | 単色 / グラデーション SVG |
| アーキテクチャ図 / フロー図 | mermaid（GitHub native レンダ + git diff 可能） | mermaid プレビュー MCP（claude-mermaid 等） | テキスト箇条書きで構造説明 |
| 概念図 / 手書き感の図 | excalidraw MCP（PNG export） | mermaid | 静的 PNG |
| リリース告知 GIF（Slack 等） | GIF 作成 Skill | — | 静止画告知 |
| バージョン違いの量産（ベース固定 + 文字差し替え） | AI 画像生成 MCP の edit 系 | テンプレ画像 + 画像編集 | 手作業 |

**ツール検出の流れ**: 監査時に利用可能 MCP / Skill を確認し、**この repo の作業で使えるツール一覧**をユーザーに提示してから戦略を選ぶ。

## 実行のルール

### 既存資産の扱い
- **既存の長文を消さず折りたたむ**: 過去のステータス / バージョン履歴は `<details><summary>...</summary>...</details>` で残す。情報量を削るのではなく見せ方を変える
- **既存画像があれば上書き前に確認**: 同名ファイルを生成する前に diff を提示

### CI 修正
- **責任範囲を明確化**: 「自分の変更で壊れたもの」と「元から壊れてた既存問題」を区別し、後者は独立タスクとしてユーザーの判断を仰ぐ

### Release
- **Release notes は CHANGELOG から流用**: あれば該当バージョンセクションをコピー。無ければ `git log <prev>..<this>` から生成提案を作る
- **`--latest` フラグ**: 最新の安定版にだけ付ける。古いバージョンを後追いで作る時は付けない

### OG バナー / Social preview
- **1280x640 PNG が GitHub Social preview の推奨サイズ**
- ファイル配置: `.github/og.png`（PNG 優先）または `.github/og.svg`（fallback / 編集可能ソース）
- README embed: `<p align="center"><img src=".github/og.png" alt="..." width="100%"></p>`
- **GitHub の Social preview（URL シェア時のカード）は Settings UI からの手動アップロード必須** — API 経由設定不可。生成までは自動化、アップロードはユーザーに依頼

### README hero 画像
- ファイル配置: `.github/hero.png`（または `.github/hero.svg`）
- README 冒頭、H1 の前後に embed
- OG バナーとトーン（色 / フォント / 雰囲気）を揃える。レイアウトは別で良い

### README 内の図
- **構造図 / フロー図 → mermaid**（コードブロックで GitHub がレンダ、git diff も読める、長期メンテに耐える）
- **概念図 / 手書き感 → excalidraw**（PNG export して `.github/diagrams/` に配置）
- **画像ファイル化する場合のディレクトリ**: `.github/diagrams/`

### topics
- **検索キーワードとして機能する語**を選ぶ（プロジェクトのドメイン / 言語 / フレームワーク / カテゴリ / 関連エコシステム）

### README の冒頭順序の推奨
1. OG バナー or hero 画像（任意、性格に応じて）
2. プロジェクト名 H1
3. バッジ群
4. 1 行 pitch（blockquote `>` で目立たせる）
5. 多言語版へのリンク（あれば）
6. 「30 秒で何ができるか」セクション
7. 比較表
8. 折りたたみで詳細・履歴
9. インストール / Quick start / 詳細仕様

### 画像戦略のガード（判断材料として提示、押し付けない）

- **プロジェクトの性格と画像派手さをマッチさせる**: 監査 §4 の区分に対して、画像が過剰だと逆ブランディング、控えめ過ぎると放置感。区分 A（硬派系）で派手 hero + 装飾アイコン + アニメ GIF はノイズになりやすい。区分 D（創造系）で素っ気ない README は機会損失
- **メンテ負債を避ける**: 風化する画像（UI スクショ / バージョン番号入り / コード連動の図）は意識的に選ぶ。**変わりにくい所**から作る。リリース告知 GIF を毎回作るコストを取れるかは別途判断
- **ベース画像 + 文字差し替えの再利用**: バージョンごとの告知画像は AI 画像生成 MCP の edit 系でテンプレ化、毎回新規生成しない

## 完了報告に含めるもの

- 何をやったか（軸ごと、簡潔に）
- 残作業（Settings UI でしか触れない項目、ユーザー判断が要るもの）
- 告知物の選択肢を 1 度だけ提示:
  - 告知文の下書き（Show HN / X / Reddit / dev.to / Hacker News 等）
  - リリース告知 GIF（Slack 向け、GIF 作成 Skill）
  - X 投稿用 OGP 画像（AI 画像生成 MCP の edit 系でベース流用）
  - スクショ（UI 系プロジェクトなら）

$ARGUMENTS
