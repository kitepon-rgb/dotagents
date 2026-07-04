# Karpathy 流「LLM 知識ベース × Obsidian」— 第二の脳の設計根拠

- 取得日: 2026-07-04（調査担当: Fable 5 セッション）
- 確度: 高（本人 X 投稿の本文引用＝一次。X 投稿は xAI x_search 経由で本文取得・URL 保存、画面直接閲覧はしていない。報道は複数社一致）
- 関連: [[obsidian-pricing-20260704]] [[obsidian-commercial-license-20260704]] [[karpathy-joins-anthropic-techcrunch-20260519]]

## 事実関係

### Karpathy は Anthropic 所属（2026-05-19 発表）

- 本人発表: https://x.com/karpathy/status/2056753169888334312 「Personal update: I've joined Anthropic.」
- pretraining チームで「Claude 自身を使って pretraining 研究を加速する」新チームを主導（TechCrunch 2026-05-19、CNBC・Axios 同報）
- ※モデル内知識（cutoff 2026-01）には存在しない事実。「調査せず断定するな」の実証例

### Obsidian への評価（本人発言の時系列）

1. **2024-02-24 "Love letter to @obsdmd"** https://x.com/karpathy/status/1761467904737067456
   - 「Your notes are simple plain-text markdown files stored locally on your computer. **Obsidian is just UI/UX sugar** of pretty rendering and editing files.」
   - 同期は「Or you can use anything else e.g. **GitHub, it's just files** go nuts.」
   - 「no attempts to "lock you in" … free of dark patterns」
2. **2025-03-19 append-and-review note** https://x.com/karpathy/status/1902503836067229803
   - 日常メモは Apple Notes の単一テキストに追記＋浮上レビュー（「One text note ftw.」）
   - フォロー: 「I still use and like obsidian quite extensively but **for concrete projects**, not for a day to day note taking.」
3. **2026-04-02 "LLM Knowledge Bases"** https://x.com/karpathy/status/2039805659525644595 ←核心
   - **raw/ に一次ソースを収集** → LLM が .md の wiki へ**逐次コンパイル**（要約・backlink・概念記事・リンク張り）
   - **Obsidian は "IDE frontend"**（閲覧・可視化）。「**the LLM writes and maintains all of the data of the wiki, I rarely touch it directly**」
   - Q&A: wiki が育つと（例: 約100記事・40万語、**ベクトルDB無し**）複雑な質問に agent が wiki を根拠に答える
   - 出力（md・Marp スライド・matplotlib 図）も **wiki に還流**（filing back）＝探索が資産に積み上がる
   - **Linting**: LLM による健全性チェック（矛盾検出・欠落補完・新記事候補の連結発見）を定期実行
   - Web 記事の取り込みに Obsidian Web Clipper を利用
   - フォロー(2026-04-06): 「lets you **skip writing but it doesn't let you skip reading and thinking**」
4. 補助: 2022-06-03 単一ノート運用の原型 https://x.com/karpathy/status/1532852924212072448

### Obsidian の現行条件（2026-07-04 時点）

- 本体 100% 無料・商用利用も無料（商用ライセンスは任意の支援購入）。詳細は raw/ の公式写し参照
- 同期: 公式 Sync は有償オプション。**git 同期は公認の代替**（本人も「GitHub, it's just files」）

## うちの設計への含意（採用判断の根拠）

1. **「真実は git・形式は素の Markdown・Obsidian は窓」は Karpathy 本人の思想と一致**（"UI/UX sugar"）。流行が去っても脳は無傷＝流行リスクは非搭重（non-load-bearing）設計で吸収する
2. **rag/ は raw/（一次ソース変換物）と コンパイル済み記事を分離**する（本ファイルがその第1号）
3. **wiki の保守は LLM の仕事**（人間は読む・考える）。取り込み後にコンパイルパス、定期に Lint パス（矛盾・欠落・連結）を回す — 月次メモリ棚卸しと同じ枠で運用可
4. **Q&A の出力も rag/ に還流**させ、調査が常に積み上がる構造にする
5. ビルド対バイ: 類似機能の完全自作より**保守された外部パッケージ（Obsidian）を「窓」に限って依存**する。保存層には依存を置かない — 依存の可否は「置き場所」で判断する
6. `.obsidian/` は端末固有につき gitignore。同期は既存の git 運用に相乗り（真実の源を二重化しない）
