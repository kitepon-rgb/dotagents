# 規範層モデル・全文棚卸しワークシート

## 前提

- `HEAD = origin/main = d097e51` を確認済み。
- `docs/plan_canon-zerobase-audit.md` にオーナーの未コミット凍結変更あり。現行入力として読み、変更していない。
- 現層は、`shared/constitution.md`・ルート`AGENTS.md`・`PLAN.md`を現在の論理的L0、統括契約2文書をL1として集計した。
- 厳密なruntime自動読込では通常Markdownリンクは展開されないため、`PLAN.md`を除いた値も末尾に併記する。
- `shared/constitution.md`は生成物との完全一致parity対象なので、全項目に`[gate]`を付けた。exact検査される見出し・文言も同じ印で示す。
- 表中の受け皿はすべて実在確認済み。「新設要」は適合する現行所有面がないもの。

## 1. `shared/constitution.md`

| 文書:行 | 規則の要旨(20字以内) | 現層 | 提案層 | 理由(15字以内) | 移動時の受け皿 |
|---|---|---:|---|---|---|
| constitution:1,5,14,23,31,42,57,63,69,83,90 | [gate] 章見出し10件 | L0 | L0 | exact検査対象 | — |
| constitution:3 | [gate] 共通正本はconstitution | L0 | L0 | 所有境界 | — |
| constitution:3 | [gate] host固有はdelta | L0 | L0 | 所有境界 | — |
| constitution:3 | [gate] 配布物は生成物 | L0 | L0 | 編集先を変える | — |
| constitution:3 | [gate] 生成物を直編集しない | L0 | L0 | 即時禁止 | — |
| constitution:3 | [gate] project規範を優先 | L0 | L0 | 衝突時の判断 | — |
| constitution:7 | [gate] 名前と役割はベル | L0 | L0 | 人格宣言 | — |
| constitution:9 | [gate] 本音で共同設計する | L0 | L0 | 応答を変える | — |
| constitution:10 | [gate] 成長と成功へ向き合う | L0 | L0 | 人格宣言 | — |
| constitution:11 | [gate] 柔らかく厳密に話す | L0 | L0 | 口調を変える | — |
| constitution:12 | [gate] 応答は必ず日本語 | L0 | L0 | 即時出力制約 | — |
| constitution:16 | [gate] 方針質問は先に会話 | L0 | L0 | 着手判断を変える | — |
| constitution:16 | [gate] 反応前に実装しない | L0 | L0 | 設計局面の停止 | — |
| constitution:17 | [gate] 会話をフォーム化しない | L0 | L0 | 応答方法を変える | — |
| constitution:18 | [gate] 自明なら確認せず実行 | L0 | L0 | 不要停止を防ぐ | — |
| constitution:18 | [gate] 会話優先は設計局面のみ | L0 | L0 | 適用条件 | — |
| constitution:19 | [gate] ツール前に範囲を伝える | L0 | L0 | 即時行動 | — |
| constitution:19 | [gate] 節目と失敗を報告 | L0 | L0 | 進行を変える | — |
| constitution:20 | [gate] 既存裁定を引き継ぐ | L0 | L0 | 反復判断を固定 | — |
| constitution:20 | [gate] 変更理由を示す | L0 | L0 | 裁定変更の制約 | — |
| constitution:21 | [gate] 別問題を混同しない | L0 | L0 | scope制約 | — |
| constitution:21 | [gate] 依頼外を完了条件にしない | L0 | L0 | scope制約 | — |
| constitution:21 | [gate] 拡張は裁定を仰ぐ | L0 | L0 | 権限境界 | — |
| constitution:25 | [gate] 目的外を行わない | L0 | L0 | scopeの核 | — |
| constitution:25 | [gate] 曖昧なら最小範囲へ | L0 | L0 | 即時判断 | — |
| constitution:25 | [gate] 受入条件を最小化 | L0 | L0 | 実装を制限 | — |
| constitution:25 | [gate] 途中の拡張は提案へ | L0 | L0 | scope膨張防止 | — |
| constitution:26 | [gate] 目的を縮小しない | L0 | L0 | 目標維持 | — |
| constitution:26 | [gate] 難所は依存リスクを示す | L0 | L0 | 逃避防止 | — |
| constitution:26 | [gate] 成果は届いた製品 | L0 | L0 | 完了判定 | — |
| constitution:26 | [gate] repo変更はpush完了 | L0 | 矛盾解消 | P1正面矛盾 | shared/constitution.md |
| constitution:26 | [gate] 公開はreleaseまで完遂 | L0 | L1 | publish時だけ | shared/orchestrate/contract.md |
| constitution:26 | [gate] 承認待ち以外で止めない | L0 | L0 | 完了境界 | — |
| constitution:26 | [gate] 停止位置と条件を示す | L0 | L0 | blocker報告 | — |
| constitution:27 | [gate] 暗黙fallback禁止 | L0 | L0 | 失敗時の即時制約 | — |
| constitution:27 | [gate] 例外fallbackを可視化 | L0 | L0 | 例外条件 | — |
| constitution:28 | [gate] 根本原因を先に直す | L0 | L0 | 修理方針 | — |
| constitution:28 | [gate] 回避は一時手段だけ | L0 | L0 | 回避条件 | — |
| constitution:28 | [gate] 正しいAPI利用は正攻法 | L0 | L2 | 説明上の例外 | 新設要 |
| constitution:28 | [gate] 直せなければ条件を示す | L0 | L0 | blocker判断 | — |
| constitution:29 | [gate] 虚偽成功を禁止 | L0 | L0 | 完了報告を制約 | — |
| constitution:29 | [gate] 未テストをgreenとしない | L0 | L0 | 検証報告を制約 | — |
| constitution:33 | [gate] 最新根拠を確認する | L0 | L0 | 調査開始を変える | — |
| constitution:34 | [gate] caveatとRAGを先に検索 | L0 | L0 | 再調査防止 | — |
| constitution:35 | [gate] 不確実な指摘を棄却 | L0 | L0 | 採否を変える | — |
| constitution:35 | [gate] 通常は親の反証で足りる | L0 | L0 | 過剰監査防止 | — |
| constitution:35 | [gate] 統括監査は契約参照 | L0 | L0 | L1起動ポインタ | — |
| constitution:36 | [gate] 実装中はfocused test | L0 | L0 | 検証頻度を変える | — |
| constitution:36 | [gate] 関連testは完了時一回 | L0 | L0 | 反復防止 | — |
| constitution:36 | [gate] fullはPhaseかCIのみ | L0 | L0 | 過剰検証防止 | — |
| constitution:37 | [gate] 調査成果をRAG保存 | L0 | 矛盾解消 | P7書込scope | 新設要 |
| constitution:37 | [gate] rawと要約を分ける | L0 | L2 | 保存手順 | 新設要 |
| constitution:37 | [gate] 出典日付確度を記す | L0 | L2 | 保存手順 | 新設要 |
| constitution:37 | [gate] INDEXへ追記する | L0 | L2 | 保存手順 | 新設要 |
| constitution:38 | [gate] 良い出力も還流する | L0 | 矛盾解消 | P7書込scope | PLAN.md |
| constitution:39 | [gate] 方針発見を即正本化 | L0 | 矛盾解消 | P7書込scope | shared/constitution.md |
| constitution:39 | [gate] 共通規範は共通面へ | L0 | L1 | 規範編集時だけ | 新設要 |
| constitution:39 | [gate] 端末記憶は固有情報のみ | L0 | L0 | 保存境界 | — |
| constitution:40 | [gate] 規範は判断だけを書く | L0 | L1 | 規範編集時だけ | 新設要 |
| constitution:40 | [gate] 機械値と手順を分離 | L0 | L1 | 規範編集時だけ | 新設要 |
| constitution:40 | [gate] 肯定制限文で書く | L0 | L1 | 規範編集時だけ | 新設要 |
| constitution:44 | [gate] 統括だけdocs plan必須 | L0 | 矛盾解消 | P5粒度不整合 | shared/orchestrate/contract.md |
| constitution:44 | [gate] 通常は内蔵planで足りる | L0 | L0 | 通常レーンを軽量化 | — |
| constitution:45 | [gate] Lattice工程は明示適用 | L0 | L0 | 起動制限 | — |
| constitution:45 | [gate] AI判断導入は事前承認 | L0 | L0 | 権限境界 | — |
| constitution:45 | [gate] 進行中planは継続可 | L0 | L0 | 再確認を省く | — |
| constitution:45 | [gate] sensor利用は制限外 | L0 | L0 | 適用境界 | — |
| constitution:46-48 | [gate] statusで工程面を判定 | L0 | L2 | 詳細手順 | 新設要 |
| constitution:47-48 | [gate] ready時はLattice正本 | L0 | L2 | 工程固有契約 | 新設要 |
| constitution:48 | [gate] invalidはfail closed | L0 | L2 | 工程例外処理 | 新設要 |
| constitution:49-50 | [gate] 未初期化時の導入手順 | L0 | L2 | 詳細手順 | 新設要 |
| constitution:50-51 | [gate] Markdown正本の条件 | L0 | L2 | 工程例外処理 | 新設要 |
| constitution:51-52 | [gate] Markdownは思想を所有 | L0 | L2 | 文書所有詳細 | 新設要 |
| constitution:52-53 | [gate] ToDoはtransaction更新 | L0 | L2 | CLI詳細 | 新設要 |
| constitution:53-54 | [gate] cutoverを同時処理 | L0 | L2 | 移行手順 | 新設要 |
| constitution:54-55 | [gate] 移転済みTODOを残さない | L0 | L2 | 移行手順 | 新設要 |
| constitution:55 | [gate] 完了planをarchive | L0 | L2 | 文書衛生 | docs/00_overview.md |
| constitution:59 | [gate] 通常レーンを既定 | L0 | L0 | レーン選択 | — |
| constitution:59 | [gate] 技法は両レーンで利用可 | L0 | L0 | 自由の制約化防止 | — |
| constitution:60 | [gate] 統括は四条件ORのみ | L0 | L0 | L1起動トリガー | — |
| constitution:60 | [gate] 非該当は通常レーン | L0 | L0 | 排他的制限 | — |
| constitution:60 | [gate] 予定外中断はhandoff | L0 | L0 | 中断時判断 | — |
| constitution:61 | [gate] active WIPは本筋+緊急 | L0 | L0 | 常時並行制約 | — |
| constitution:61 | [gate] campaign内workerは別枠 | L0 | L1 | 統括時だけ | shared/orchestrate/contract.md |
| constitution:61 | [gate] 1threadは1成果かPhase | L0 | L0 | thread寿命 | — |
| constitution:61 | [gate] compact後にhandoff準備 | L0 | L0 | 文脈切替判断 | — |
| constitution:65 | [gate] 必要権限を都度伝える | L0 | L0 | 権限判断 | — |
| constitution:66 | [gate] 高リスクは三点説明 | L0 | L0 | 実行前制約 | — |
| constitution:67 | [gate] 他ツール領域へ書かない | L0 | L0 | 所有境界 | — |
| constitution:67 | [gate] 連携は明示connector | L0 | L0 | 設計判断 | — |
| constitution:71 | [gate] shellはaiterm PTY既定 | L0 | L0 | exact・即時選択 | — |
| constitution:71 | [gate] 軽い読取は単発shell可 | L0 | L0 | 例外条件 | — |
| constitution:71 | [gate] PTYは承認迂回でない | L0 | L0 | 権限境界 | — |
| constitution:72 | [gate] 移動改名削除は承認必須 | L0 | L0 | 破壊操作制約 | — |
| constitution:72 | [gate] 文書差異で実体を動かさない | L0 | L0 | 誤操作防止 | — |
| constitution:72 | [gate] 移動前後を説明報告 | L0 | L1 | 操作時だけ | README.md |
| constitution:72 | [gate] 端末裁定を一般化しない | L0 | L0 | scope境界 | — |
| constitution:73 | [gate] 並行commitはpathspec | L0 | L0 | 混入防止 | — |
| constitution:74 | [gate] 複数行messageは-F | L0 | L2 | shell手順 | README.md |
| constitution:75 | [gate] push等は明示指示のみ | L0 | 矛盾解消 | P1採用済み | shared/constitution.md |
| constitution:76 | [gate] 公開物は既定祖先のみ | L0 | L1 | publish時だけ | shared/orchestrate/contract.md |
| constitution:76 | [gate] 祖先検証コマンド | L0 | L2 | 実行手順 | docs/04_ci.md |
| constitution:77 | [gate] rsync削除前dry-run | L0 | L1 | 危険操作時だけ | 新設要 |
| constitution:77 | [gate] gitignore資産も確認 | L0 | L1 | 危険操作時だけ | 新設要 |
| constitution:78 | [gate] 説明前に実diffを読む | L0 | L0 | 事実確認 | — |
| constitution:79 | [gate] 削除調査をgrep単独にしない | L0 | L1 | 削除時だけ | 新設要 |
| constitution:80 | [gate] 管理外編集前にtar退避 | L0 | L1 | 操作時だけ | README.md |
| constitution:81 | [gate] repo移行前に隠れ資産確認 | L0 | L1 | 終活時だけ | PLAN.md |
| constitution:85 | [gate] 実施skip変更検証を報告 | L0 | L0 | 報告を変える | — |
| constitution:86 | [gate] 未完を理由付きで示す | L0 | 削除 | 原則5から導出 | — |
| constitution:87 | [gate] 一枚目は運用中だけ | L0 | L0 | 報告を変える | — |
| constitution:87 | [gate] task IDは日本語化 | L0 | L2 | 表示詳細 | 新設要 |
| constitution:88 | [gate] 視覚物は3秒理解まで | L0 | L1 | 視覚成果時だけ | 新設要 |
| constitution:92 | [gate] tool前ノイズを出さない | L0 | 削除 | 出力規則から導出 | — |
| constitution:93 | [gate] 内部推論を出力しない | L0 | L0 | 即時出力制約 | — |
| constitution:94 | [gate] 簡潔だが断片化しない | L0 | L0 | 即時出力制約 | — |

## 2. ルート `AGENTS.md`

| 文書:行 | 規則の要旨(20字以内) | 現層 | 提案層 | 理由(15字以内) | 移動時の受け皿 |
|---|---|---:|---|---|---|
| AGENTS:3 | 全AIのproject正典 | L0 | L0 | 所有宣言 | — |
| AGENTS:3 | ClaudeはCLAUDE経由 | L0 | L2 | host実装詳細 | README.md |
| AGENTS:5 | 共通憲法の正本を指す | L0 | 削除 | 共通憲法と重複 | — |
| AGENTS:5 | host deltaと生成物を指す | L0 | L2 | 構成説明 | docs/00_overview.md |
| AGENTS:6 | 趣旨原則はPLAN正本 | L0 | L0 | L0ポインタ | — |
| AGENTS:6 | 詳細手順はREADME | L0 | L0 | L2ポインタ | — |
| AGENTS:10 | dotagentsは同期dotfiles | L0 | L0 | repo役割 | — |
| AGENTS:11-13 | installの配布先一覧 | L0 | L2 | 配置手順 | README.md |
| AGENTS:17 | 配布ファイル編集は即反映 | L0 | L0 | symlink事故防止 | — |
| AGENTS:17 | 憲法はgenerator更新 | L0 | L2 | 生成手順 | docs/04_ci.md |
| AGENTS:17 | 生成物を直編集しない | L0 | 削除 | 共通憲法と重複 | — |
| AGENTS:18 | installは冪等 | L0 | L2 | 実装仕様 | README.md |
| AGENTS:18 | 実ファイル宛先はSKIP | L0 | L2 | 導入例外 | README.md |
| AGENTS:18 | installはfail closed | L0 | L2 | 実装仕様 | README.md |
| AGENTS:22 | 工場そのものはdotagents | L0 | L0 | 所有境界 | — |
| AGENTS:22 | 全project統合を統括 | L0 | L0 | 責務宣言 | — |
| AGENTS:23 | 現役管理は11製品 | L0 | L0 | 所有範囲 | — |
| AGENTS:23 | 製品名の完全列挙 | L0 | L2 | 可変台帳 | docs/factory-product-contracts.md |
| AGENTS:23 | host非対応はunsupported | L0 | L2 | host matrix | docs/factory-host-product-matrix.md |
| AGENTS:23 | Codegraphはretired | L0 | L0 | 導入禁止を変える | — |
| AGENTS:23 | 基盤toolchainは別区分 | L0 | L2 | 可変台帳 | docs/factory-product-contracts.md |
| AGENTS:23 | Oracleはrollback専用 | L0 | L1 | 利用局面限定 | docs/02_models.md |
| AGENTS:23 | 現役契約への導線 | L0 | L2 | 参照詳細 | docs/00_overview.md |
| AGENTS:23 | 編入経緯への導線 | L0 | L2 | 履歴 | docs/archive/plan_lattice-factory-integration.md |
| AGENTS:24 | BugHubは内部部品 | L0 | L0 | 所有境界 | — |
| AGENTS:24 | BugHubは読取集約 | L0 | L0 | 書込境界 | — |
| AGENTS:24 | severityは報告元所有 | L0 | L0 | 決定権境界 | — |
| AGENTS:25 | 製品状態は各製品が所有 | L0 | L0 | 所有境界 | — |
| AGENTS:25 | dotagentsは統合契約を所有 | L0 | L0 | 所有境界 | — |
| AGENTS:25 | 管理面は製品を書換えない | L0 | L0 | 書込禁止 | — |
| AGENTS:26 | コアrepo修正権限あり | L0 | L0 | 恒久権限 | — |
| AGENTS:26 | コア修理は公開まで完遂 | L0 | L1 | release時だけ | shared/orchestrate/contract.md |
| AGENTS:26 | 第三者patch権限は含まない | L0 | L0 | 所有境界 | — |
| AGENTS:26 | H操作は別承認 | L0 | 矛盾解消 | P6分離対象 | AGENTS.md |
| AGENTS:26 | 各repo正典を守る | L0 | L0 | 常時優先規則 | — |
| AGENTS:26 | 公開commitは既定祖先 | L0 | L1 | publish時だけ | shared/orchestrate/contract.md |
| AGENTS:26 | 未実装gateは次wave導入 | L0 | L1 | release時だけ | docs/04_ci.md |
| AGENTS:27 | native枠を工場上限にしない | L0 | L1 | 委譲時だけ | docs/02_models.md |
| AGENTS:27 | 外部実行を積極利用 | L0 | L1 | 委譲時だけ | docs/02_models.md |
| AGENTS:27 | 入れ子Codexを許可 | L0 | L1 | Codex委譲時だけ | docs/05_codex-fragments.md |
| AGENTS:27 | connectorは相談専用 | L0 | L1 | 委譲時だけ | docs/02_models.md |
| AGENTS:27 | 委譲正本への導線 | L0 | 削除 | L0レーン節で充足 | — |
| AGENTS:28 | P0/P1だけ即時修理 | L0 | 矛盾解消 | P16共通重複 | shared/orchestrate/contract.md |
| AGENTS:28 | 非criticalはqueueへ | L0 | 矛盾解消 | P16共通重複 | shared/orchestrate/contract.md |
| AGENTS:28 | maintenance wave一回 | L0 | 矛盾解消 | P16共通重複 | shared/orchestrate/contract.md |
| AGENTS:28 | 欠陥別の儀式を作らない | L0 | 矛盾解消 | P16共通重複 | shared/orchestrate/contract.md |
| AGENTS:28 | 第三者欠陥は完全範囲外 | L0 | L0 | dotagents固有境界 | — |
| AGENTS:28 | adapter欠陥は範囲内 | L0 | L0 | dotagents固有境界 | — |
| AGENTS:28 | 権限外はH待ちでcarry | L0 | L1 | 統括時だけ | shared/orchestrate/contract.md |
| AGENTS:29 | Control規則は契約正本 | L0 | L0 | L1起動ポインタ | — |
| AGENTS:30 | コア区分変更は独立wave | L0 | L1 | 製品変更時だけ | README.md |
| AGENTS:30 | 関連台帳等を同時更新 | L0 | L2 | 変更手順 | README.md |
| AGENTS:30 | 第三者化後は公開入口のみ | L0 | L1 | 所有移管時だけ | README.md |
| AGENTS:30 | 削除でも履歴を保持 | L0 | L2 | 移行手順 | README.md |
| AGENTS:30 | source移動は別承認 | L0 | L0 | 破壊操作制約 | — |
| AGENTS:34 | onboarding詳細はREADME | L0 | L0 | L2起動ポインタ | — |
| AGENTS:36 | 端末前提一覧 | L0 | L2 | setup手順 | README.md |
| AGENTS:36 | host別製品を導入 | L0 | L2 | setup手順 | docs/factory-host-product-matrix.md |
| AGENTS:36 | Codegraphを導入しない | L0 | L2 | setup手順 | README.md |
| AGENTS:36 | MCP名とOracle条件 | L0 | L2 | setup手順 | README.md |
| AGENTS:37 | cloneコマンド | L0 | L2 | setup手順 | README.md |
| AGENTS:38 | 既存実ファイルを退避 | L0 | L2 | setup手順 | README.md |
| AGENTS:38 | 価値ある規範を先に移植 | L0 | L2 | migration手順 | docs/05_codex-fragments.md |
| AGENTS:38 | 生成後に旧実体を削除 | L0 | L2 | migration手順 | docs/05_codex-fragments.md |
| AGENTS:39 | install/config/hook手順 | L0 | L2 | setup手順 | README.md |
| AGENTS:39 | applyは端末承認後だけ | L0 | L2 | setup手順 | docs/05_codex-fragments.md |
| AGENTS:39 | 製品自身にhookを管理させる | L0 | L2 | setup手順 | README.md |
| AGENTS:39 | verify-installを通す | L0 | L2 | setup手順 | README.md |
| AGENTS:40 | settingsを冪等merge | L0 | L2 | setup手順 | docs/03_settings-fragments.md |
| AGENTS:40 | 必須hookを全端末へ | L0 | L2 | setup手順 | docs/03_settings-fragments.md |
| AGENTS:41 | Codex断片を適用 | L0 | L2 | setup手順 | docs/05_codex-fragments.md |
| AGENTS:41 | 親model既定を変えない | L0 | L0 | 所有境界 | — |
| AGENTS:41 | routing greenまで渡さない | L0 | L2 | setup gate | docs/05_codex-fragments.md |
| AGENTS:41 | hook trustはH承認 | L0 | L2 | setup手順 | docs/05_codex-fragments.md |
| AGENTS:42 | memoryと週次更新を設置 | L0 | L2 | setup手順 | README.md |
| AGENTS:46 | fetch照合後に作業 | L0 | L0 | 常時安全規則 | — |
| AGENTS:46 | 作業後は必ずpush | L0 | 矛盾解消 | P1採用済み | AGENTS.md |
| AGENTS:47 | dirtyの意図を先に読む | L0 | L0 | 即時安全規則 | — |
| AGENTS:47 | dirtyを勝手に消さない | L0 | L0 | 破壊防止 | — |
| AGENTS:48 | PLANを趣旨原則正本とする | L0 | L0 | L0ポインタ | — |
| AGENTS:48 | planがTODOを兼ねる | L0 | 矛盾解消 | P4正本二重化 | AGENTS.md |
| AGENTS:48 | 完了文書はarchive | L0 | L2 | 文書衛生 | docs/00_overview.md |
| AGENTS:48 | 環境作業は残件を先に読む | L0 | L0 | 着手トリガー | — |
| AGENTS:48 | 調査前にRAGとcaveat | L0 | 削除 | 共通憲法と重複 | — |
| AGENTS:52-60 | 配置表7種 | L0 | L2 | 可変配置台帳 | docs/01_project-layout.md |
| AGENTS:62 | 一階層だけsymlink | L0 | L2 | install仕様 | README.md |
| AGENTS:62 | skill面は一方だけ | L0 | L2 | install仕様 | README.md |
| AGENTS:62 | 新規entry後は再install | L0 | L2 | install手順 | README.md |
| AGENTS:66 | skillにname/description | L0 | L2 | authoring手順 | docs/01_project-layout.md |
| AGENTS:66 | descriptionは起動条件 | L0 | L2 | authoring手順 | docs/01_project-layout.md |
| AGENTS:68-73 | frontmatter例 | L0 | L2 | 実例 | docs/01_project-layout.md |
| AGENTS:77 | commandはdescription必須 | L0 | L2 | authoring手順 | docs/01_project-layout.md |
| AGENTS:77 | argument-hintは任意 | L0 | L2 | authoring手順 | docs/01_project-layout.md |
| AGENTS:77 | ARGUMENTSを利用可 | L0 | L2 | authoring手順 | docs/01_project-layout.md |
| AGENTS:81 | learned skillは置かない | L0 | L2 | 配置除外 | docs/01_project-layout.md |
| AGENTS:82 | Claude固有状態は置かない | L0 | L2 | 配置除外 | docs/01_project-layout.md |
| AGENTS:83 | Codex固有状態は置かない | L0 | L2 | 配置除外 | docs/01_project-layout.md |
| AGENTS:84 | system skillは置かない | L0 | L2 | 配置除外 | docs/01_project-layout.md |
| AGENTS:85 | global規範は生成配布 | L0 | L2 | 配置詳細 | docs/05_codex-fragments.md |
| AGENTS:85 | override非空はFAIL | L0 | L2 | 検証詳細 | docs/05_codex-fragments.md |
| AGENTS:86 | repo内ローカル状態を置かない | L0 | L2 | 配置除外 | docs/01_project-layout.md |
| AGENTS:90 | buildなし・lint/CI入口 | L0 | L2 | 検証手順 | docs/04_ci.md |
| AGENTS:92 | 構成変更後にinstall | L0 | L2 | 検証手順 | README.md |
| AGENTS:93 | symlink先を確認 | L0 | L2 | 検証手順 | README.md |
| AGENTS:94 | 新sessionで一覧確認 | L0 | L2 | 検証手順 | README.md |
| AGENTS:98 | agents-updateの役割 | L0 | L2 | 運用手順 | README.md |
| AGENTS:98 | 週次常設が必須 | L0 | L2 | 運用手順 | README.md |
| AGENTS:98 | PACKAGESを直接編集 | L0 | L2 | 実装詳細 | README.md |
| AGENTS:98 | npm link上書きに注意 | L0 | L2 | 既知の罠 | README.md |
| AGENTS:100 | 管理製品をlatest維持 | L0 | L1 | update局面 | README.md |
| AGENTS:100 | 更新失敗を非0にする | L0 | L1 | update局面 | README.md |
| AGENTS:100 | 上流変更へ同時追従 | L0 | L1 | update局面 | README.md |
| AGENTS:104 | 旧clone pathを修復 | L0 | L2 | 既知の罠 | README.md |
| AGENTS:105 | skill面を同居させない | L0 | L2 | 既知の罠 | docs/05_codex-fragments.md |
| AGENTS:106 | Throughline物を再収録しない | L0 | L2 | 製品固有の罠 | docs/factory-product-contracts.md |

## 3. `PLAN.md`

原則番号は残す前提。`L0`提案は「番号付きの一文骨子を残す」、`L1/L2`提案は同じ原則内の説明をポインタへ薄くする意味。

| 文書:行 | 規則の要旨(20字以内) | 現層 | 提案層 | 理由(15字以内) | 移動時の受け皿 |
|---|---|---:|---|---|---|
| PLAN:3 | 原則1〜10の番号骨子不変 | L0 | L0 | 生きた参照 | — |
| PLAN:7 | dotagentsは開発工場 | L0 | L0 | 所有宣言 | — |
| PLAN:9 | 規範面の完全列挙 | L0 | L2 | 地図情報 | docs/00_overview.md |
| PLAN:10 | symlink同期ハブ | L0 | L2 | 構成説明 | README.md |
| PLAN:10 | GitHubが真実の源 | L0 | L0 | 原則の核 | — |
| PLAN:11 | RAG/docs/Caveatの役割 | L0 | L2 | 保存面の地図 | docs/00_overview.md |
| PLAN:12 | 管理11製品の列挙 | L0 | L2 | 可変台帳 | docs/factory-product-contracts.md |
| PLAN:12 | Codegraphはretired | L0 | L0 | 導入禁止を変える | — |
| PLAN:12 | toolchain等の区分 | L0 | L2 | 可変台帳 | docs/factory-product-contracts.md |
| PLAN:12 | 編入記録への導線 | L0 | L2 | 履歴 | docs/archive/plan_lattice-factory-integration.md |
| PLAN:14 | 本旨は工場最適化 | L0 | L0 | scope宣言 | — |
| PLAN:14 | 個別製品監査は依頼時のみ | L0 | L0 | 所有境界 | — |
| PLAN:14 | project介入を四種へ限定 | L0 | L1 | 介入時だけ | docs/01_project-layout.md |
| PLAN:14 | Spotterはmarker限定 | L0 | L2 | 製品固有契約 | docs/factory-product-contracts.md |
| PLAN:18 | 原則1・上位知能は三用途 | L0 | L0 | 番号骨子 | — |
| PLAN:18 | 固定実装は安価枠へ | L0 | L1 | 委譲時だけ | docs/02_models.md |
| PLAN:18 | 統括の担当範囲を限定 | L0 | L1 | 統括時だけ | shared/orchestrate/contract.md |
| PLAN:19 | 原則2・GitHubが真実 | L0 | L0 | 番号骨子 | — |
| PLAN:19 | 全作業でfetch照合 | L0 | L0 | 常時安全規則 | — |
| PLAN:19 | 作業後は必ずpush | L0 | 矛盾解消 | P1採用済み | PLAN.md |
| PLAN:20 | 原則3・repo知識優先 | L0 | L0 | 番号骨子 | — |
| PLAN:20 | 端末記憶は固有情報のみ | L0 | L0 | 保存境界 | — |
| PLAN:21 | 原則4・全repo保持しない | L0 | L0 | 番号骨子 | — |
| PLAN:21 | 削除はオーナー承認 | L0 | L0 | 破壊操作制約 | — |
| PLAN:21 | 安全判定は運用手順参照 | L0 | L2 | 終活手順 | 新設要 |
| PLAN:22 | 原則5・F/A/H分類 | L0 | 矛盾解消 | P2採用済み | PLAN.md |
| PLAN:23 | 原則6・資産をnative比較 | L0 | L0 | 番号骨子 | — |
| PLAN:23 | 劣後資産は廃止提案 | L0 | L0 | 判断トリガー | — |
| PLAN:23 | 廃止承認はH | L0 | L0 | 権限境界 | — |
| PLAN:23 | 世代交代はowner起点 | L0 | L0 | 起動トリガー | — |
| PLAN:23 | 資産見直しを定期化しない | L0 | L2 | 運用理由 | docs/02_models.md |
| PLAN:23 | 衛生作業は月次可 | L0 | L2 | 運用手順 | 新設要 |
| PLAN:23 | 前提行を資産へ付ける | L0 | L2 | authoring手順 | docs/02_models.md |
| PLAN:24 | 原則7・依存は窓だけ | L0 | L0 | 番号骨子 | — |
| PLAN:24 | 真実はMarkdown+git | L0 | L0 | 保存境界 | — |
| PLAN:24 | Obsidian等の具体例 | L0 | L2 | 根拠と実例 | rag/second-brain/longterm-memory-tools-survey.md |
| PLAN:25 | 原則8・重い監査を限定 | L0 | L0 | 番号骨子 | — |
| PLAN:25 | Phase監査はcross-provider | L0 | L1 | 統括時だけ | shared/orchestrate/contract.md |
| PLAN:25 | 指摘を反証し不確実は棄却 | L0 | L1 | 統括時だけ | shared/orchestrate/contract.md |
| PLAN:26 | 原則9・version固定禁止 | L0 | L0 | 番号骨子 | — |
| PLAN:26 | モデル解決は02のみ | L0 | L1 | 配置時だけ | docs/02_models.md |
| PLAN:26 | 役割別モデル骨格 | L0 | L2 | 決定表へ集約 | docs/02_models.md |
| PLAN:27 | 原則10・知識を還流 | L0 | 矛盾解消 | P7書込scope | PLAN.md |
| PLAN:27 | 外部資料はRAGへ | L0 | 矛盾解消 | P7書込scope | 新設要 |
| PLAN:27 | 出力もRAGへ還流 | L0 | 矛盾解消 | P7書込scope | 新設要 |
| PLAN:27 | raw/要約/INDEXの六手順 | L0 | L2 | 詳細運用 | 新設要 |
| PLAN:31 | 文書を三種に分類 | L0 | L2 | 文書管理手順 | docs/00_overview.md |
| PLAN:32 | 統括planはdocsへ | L0 | 矛盾解消 | P5粒度不整合 | shared/orchestrate/contract.md |
| PLAN:32 | 通常は会話か内蔵plan | L0 | L0 | 通常レーンを軽量化 | — |
| PLAN:32 | 会話等を工程正本にしない | L0 | L2 | 工程所有詳細 | 新設要 |
| PLAN:33 | Lattice statusで正本決定 | L0 | L2 | 工程固有手順 | 新設要 |
| PLAN:33 | ready時はLatticeだけ | L0 | L2 | 工程所有詳細 | 新設要 |
| PLAN:33 | invalidでfallbackしない | L0 | L2 | 工程例外処理 | 新設要 |
| PLAN:34 | 完了文書はarchive | L0 | L2 | 文書衛生 | docs/00_overview.md |
| PLAN:35 | 時間見積を判断に使わない | L0 | L0 | 計画を即時制約 | — |
| PLAN:36 | 共通文書は端末非依存 | L0 | L1 | 文書編集時だけ | 新設要 |
| PLAN:36 | 方針は理由ごと書く | L0 | L1 | 文書編集時だけ | 新設要 |
| PLAN:37 | 方針発見を即正本化 | L0 | 矛盾解消 | P7書込scope | PLAN.md |
| PLAN:37 | 発見種別ごとの書き先 | L0 | L2 | routing詳細 | 新設要 |
| PLAN:37 | 迷ったらPLANへ仮置き | L0 | 削除 | 誤正本化を誘発 | — |
| PLAN:41 | sync-sweep greenで開始 | L0 | L2 | 運用手順 | 新設要 |
| PLAN:41 | 掃引検査項目の完全列挙 | L0 | L2 | CLI仕様 | 新設要 |
| PLAN:41 | 掃引台帳をcampaign管理 | L0 | L2 | 運用手順 | 新設要 |
| PLAN:42 | repoを三分類する | L0 | L2 | 終活手順 | 新設要 |
| PLAN:42 | 休眠は端末状態だけ | L0 | L1 | 終活時の判断 | 新設要 |
| PLAN:42 | 生死はownerだけが決定 | L0 | L0 | 所有境界 | — |
| PLAN:42 | 削除安全条件の完全列挙 | L0 | L2 | 終活手順 | 新設要 |
| PLAN:42 | 不足資産を救済後削除 | L0 | L2 | 終活手順 | 新設要 |
| PLAN:42 | GitHub側はarchive | L0 | L2 | 終活手順 | 新設要 |
| PLAN:43 | agents-updateを週次常設 | L0 | L2 | 定常運用 | README.md |
| PLAN:44 | memoryとRAGを月次整理 | L0 | L2 | 定常運用 | 新設要 |
| PLAN:45 | 世代交代時の更新順 | L0 | L2 | 詳細手順 | docs/02_models.md |
| PLAN:49 | 工程正本と残件への導線 | L0 | L2 | 現在地情報 | docs/00_overview.md |

## 4. `shared/orchestrate/contract.md`

| 文書:行 | 規則の要旨(20字以内) | 現層 | 提案層 | 理由(15字以内) | 移動時の受け皿 |
|---|---|---:|---|---|---|
| contract:1 | [gate] 統括共通契約の標題 | L1 | L1 | exact検査対象 | — |
| contract:3 | 製品中立の原則とする | L1 | L1 | L1所有宣言 | — |
| contract:3 | 製品入口はappendixのみ | L1 | L1 | 複製防止 | — |
| contract:4 | 品質は構造から作る | L1 | L1 | 統括設計原則 | — |
| contract:8 | 同期状態を先に確認 | L1 | 削除 | L0規則と重複 | — |
| contract:8 | 不明な同期を黙って進めない | L1 | 削除 | L0規則から導出 | — |
| contract:9 | 変更前にbaseline green | L1 | L1 | 統括着手gate | — |
| contract:9 | refactor前にcharacterize | L1 | L1 | 安全網gate | — |
| contract:9 | 実挙動に期待を合わせる | L1 | L1 | characterization契約 | — |
| contract:10 | 統括後にF/A/H分類 | L1 | L1 | P2の正規配置 | — |
| contract:10 | Fは親裁定のcritical | L1 | L1 | 役割定義 | — |
| contract:10 | Aは固定仕様の実装 | L1 | L1 | 役割定義 | — |
| contract:10 | Hは人承認操作 | L1 | L1 | 役割定義 | — |
| contract:14 | 四条件ORで適用 | L1 | 削除 | L0起動トリガーへ | — |
| contract:14 | 重装備は四関節だけ | L1 | 矛盾解消 | P5対象 | shared/orchestrate/contract.md |
| contract:14 | 証跡文書も四関節だけ | L1 | 矛盾解消 | P5対象 | shared/orchestrate/contract.md |
| contract:14 | 小粒作業は軽量処理 | L1 | L1 | 統括内の軽量化 | — |
| contract:14 | 技法は全レーン利用可 | L1 | L1 | 自由の制約化防止 | — |
| contract:14 | Control儀式だけ統括専用 | L1 | L1 | 排他的境界 | — |
| contract:14 | docs計画TODOを正本確認 | L1 | 矛盾解消 | P5・P4近接 | shared/orchestrate/contract.md |
| contract:16 | 非該当は通常レーン | L1 | 削除 | L0規則と重複 | — |
| contract:16 | 通常はControl不要 | L1 | L1 | L1の適用除外 | — |
| contract:16 | 通常委譲はPacket不要 | L1 | L1 | 委譲境界 | — |
| contract:16 | 条件成立時に昇格 | L1 | L1 | lane遷移 | — |
| contract:16 | active Controlを降格しない | L1 | L1 | lane遷移 | — |
| contract:16 | H義務は全レーン共通 | L1 | 削除 | L0権限規則と重複 | — |
| contract:20 | lifecycle①初期化とphase | L1 | L1 | 最短実行順 | — |
| contract:20 | 漏れは実在証拠だけで補う | L1 | L2 | 回復例外 | shared/orchestrate/control-record.md |
| contract:20 | TaskとRunを順次記録 | L1 | L1 | 最短実行順 | — |
| contract:21 | lifecycle②配置予約 | L1 | L1 | 最短実行順 | — |
| contract:21 | campaign条件を親が宣言 | L1 | L1 | 最短実行順 | — |
| contract:21 | Packet後に親がdispatch | L1 | L1 | 最短実行順 | — |
| contract:21 | Packet漏れはrecover | L1 | L2 | 回復例外 | shared/orchestrate/control-record.md |
| contract:21 | Runを再dispatchしない | L1 | L1 | 重複防止 | — |
| contract:21 | executor stateを複製しない | L1 | L1 | 所有境界 | — |
| contract:22 | lifecycle③report回収裁定 | L1 | L1 | 最短実行順 | — |
| contract:22 | unresolvedをstatus確認 | L1 | L2 | CLI詳細 | shared/orchestrate/control-record.md |
| contract:22 | timeout後は同一handle回収 | L1 | L1 | 回収契約 | — |
| contract:22 | Task取消とRun取消を分離 | L1 | L1 | 状態機械境界 | — |
| contract:23 | lifecycle④campaign release | L1 | L1 | 最短実行順 | — |
| contract:23 | release後は再配置が必要 | L1 | L2 | CLI挙動詳細 | shared/orchestrate/control-record.md |
| contract:24 | lifecycle⑤不変Decision完了 | L1 | L1 | 最短実行順 | — |
| contract:24 | planをDecision証拠にしない | L1 | L1 | 証拠境界 | — |
| contract:24 | 過去digestは完全一致のみ | L1 | L2 | 回復例外 | shared/orchestrate/control-record.md |
| contract:24 | 還流後にarchive | L1 | 矛盾解消 | P7書込scope | shared/orchestrate/contract.md |
| contract:26 | Packet正本を委譲契約へ | L1 | L1 | 正本ポインタ | — |
| contract:30 | criticalだけ独立反証 | L1 | L1 | 監査範囲 | — |
| contract:30 | 非criticalは親確認 | L1 | L1 | 過剰監査防止 | — |
| contract:30 | 不確実な指摘は棄却 | L1 | 削除 | L0規則と重複 | — |
| contract:31 | Packet 8点を使う | L1 | L1 | 委譲gate | — |
| contract:31 | 親がdiff検証し採否 | L1 | L1 | 受入責任 | — |
| contract:32 | 挙動不変と修正を分ける | L1 | L1 | behavior gate | — |
| contract:32 | 修正差分と承認を明記 | L1 | L1 | behavior gate | — |
| contract:33 | revert可能単位へ分割 | L1 | L1 | 実装分割 | — |
| contract:33 | focused後に関連gate一回 | L1 | L1 | 検証頻度 | — |
| contract:33 | 並行scopeを交差させない | L1 | L1 | writer安全 | — |
| contract:34 | 外部変更前に三点説明 | L1 | 削除 | L0権限規則と重複 | — |
| contract:34 | H承認後だけ実行 | L1 | 削除 | L0権限規則と重複 | — |
| contract:34 | fallbackで隠さない | L1 | 削除 | L0原則と重複 | — |
| contract:38 | モデル解決は02だけ | L1 | L1 | L2ポインタ | — |
| contract:39 | provider関係だけ固定 | L1 | L1 | 所有境界 | — |
| contract:41-42 | Observerは親同provider | L1 | L1 | 配置原則 | — |
| contract:42 | Observerを票に数えない | L1 | L1 | 役割分離 | — |
| contract:43-45 | 相談は異provider優先 | L1 | L1 | 配置原則 | — |
| contract:44-45 | 同provider相談も許可 | L1 | L1 | 強制化防止 | — |
| contract:45 | 相談をWorker等へ混ぜない | L1 | L1 | 役割分離 | — |
| contract:46-47 | Workerは適格内で適応配置 | L1 | L1 | 配置原則 | — |
| contract:47 | 架空quotaで成功扱いしない | L1 | L1 | 虚偽fallback防止 | — |
| contract:49-51 | 配置policyとfixture詳細 | L1 | L2 | 機械実装詳細 | docs/02_models.md |
| contract:55 | writer範囲でwave分割 | L1 | L1 | writer安全 | — |
| contract:55 | 同一fileは直列化 | L1 | L1 | writer安全 | — |
| contract:55 | 一責務一受入単位 | L1 | L1 | 委譲粒度 | — |
| contract:55 | 直列化正本はcomposition | L1 | L1 | 正本ポインタ | — |
| contract:56 | [gate] 親がdiff等を検証 | L1 | L1 | exact受入契約 | — |
| contract:56 | 発見と検証を還流 | L1 | 矛盾解消 | P7書込scope | shared/orchestrate/contract.md |
| contract:57 | 安全網を本体より先行 | L1 | L1 | 実装gate | — |
| contract:57 | 未反証指摘を実装しない | L1 | L1 | 監査gate | — |
| contract:57 | 並行時に裸commit禁止 | L1 | 削除 | L0規則と重複 | — |
| contract:58 | fixed中親commit条件 | L1 | L1 | Control安全規則 | — |
| contract:58 | 交差等はworker完了待ち | L1 | L1 | Control安全規則 | — |
| contract:62 | Phaseの八段順序 | L1 | L1 | 統括骨格 | — |
| contract:64 | [gate] planに三項目必須 | L1 | L1 | exact検査対象 | — |
| contract:66 | 重監査の五段順序 | L1 | L1 | 統括骨格 | — |
| contract:66 | 件数遷移と棄却理由を残す | L1 | L1 | 監査証跡 | — |
| contract:70 | 軽量監査はTODO末一回 | L1 | L1 | 監査頻度 | — |
| contract:70 | 手補正時だけTODO記録 | L1 | L1 | 例外記録 | — |
| contract:71 | 重監査はPhase末一回 | L1 | L1 | 監査頻度 | — |
| contract:71 | critical範囲だけ重監査 | L1 | L1 | 監査範囲 | — |
| contract:71 | 検証者は異provider原則 | L1 | L1 | 独立性 | — |
| contract:71 | 同TODOへ反復しない | L1 | L1 | 監査増殖防止 | — |
| contract:72 | 不安等で監査を増やさない | L1 | L1 | 監査増殖防止 | — |
| contract:76 | P0/P1だけ即時修理 | L1 | L1 | maintenance判定 | — |
| contract:76 | 非criticalはqueue一回 | L1 | L1 | maintenance判定 | — |
| contract:76 | 欠陥別の儀式を作らない | L1 | L1 | 文書増殖防止 | — |
| contract:77 | maintenance waveは一回 | L1 | L1 | 実行順 | — |
| contract:77 | repo別修理commitで閉じる | L1 | L1 | 受入単位 | — |
| contract:77 | 関連小修正は統合可 | L1 | L1 | 過分割防止 | — |
| contract:77 | H等は条件付きcarry | L1 | L1 | blocker処理 | — |
| contract:77 | 未修理を成功扱いしない | L1 | 削除 | L0原則から導出 | — |
| contract:81 | 還流作法は共通憲法参照 | L1 | 矛盾解消 | P7scope追従 | shared/orchestrate/contract.md |

## 5. `shared/orchestrate/delegation-contract.md`

| 文書:行 | 規則の要旨(20字以内) | 現層 | 提案層 | 理由(15字以内) | 移動時の受け皿 |
|---|---|---:|---|---|---|
| delegation:3 | 最低安全契約は全委譲 | L1 | L1 | 委譲起動契約 | — |
| delegation:3 | Packetは統括だけ | L1 | L1 | レーン境界 | — |
| delegation:3 | 通常委譲は明確指示で受入 | L1 | L1 | 軽量委譲契約 | — |
| delegation:3 | host固有はappendixだけ | L1 | L1 | 複製防止 | — |
| delegation:3 | aiterm運用は別正本 | L1 | L2 | 実行手順ポインタ | shared/orchestrate/aiterm-dispatch.md |
| delegation:7 | [gate] task IDを一意化 | L1 | L1 | 重複防止 | — |
| delegation:7 | [gate] 同一taskを重複起動しない | L1 | L1 | exact検査対象 | — |
| delegation:7 | 書込範囲を明示 | L1 | L1 | scope安全 | — |
| delegation:7 | 共有worktreeはread-only | L1 | L1 | writer安全 | — |
| delegation:7 | writerは専用worktree | L1 | L1 | writer安全 | — |
| delegation:7 | 非交差範囲だけ共有可 | L1 | L1 | 限定例外 | — |
| delegation:8 | [gate] 子のgit履歴操作禁止 | L1 | L1 | exact安全契約 | — |
| delegation:8 | 子のH操作を禁止 | L1 | L1 | 権限境界 | — |
| delegation:8 | 子の秘密読取転記を禁止 | L1 | L1 | 秘密境界 | — |
| delegation:9 | timeoutはunknown | L1 | L1 | 状態契約 | — |
| delegation:9 | 同一handleで回収 | L1 | L1 | 重複防止 | — |
| delegation:9 | 親がdiffと検証で受入 | L1 | L1 | 最終責任 | — |
| delegation:9 | 未検証を成功扱いしない | L1 | 削除 | L0原則と重複 | — |
| delegation:10 | 同種host委譲を許可 | L1 | L1 | 委譲自由 | — |
| delegation:10 | modelとeffortを明示 | L1 | 矛盾解消 | P8等価条件不足 | shared/orchestrate/delegation-contract.md |
| delegation:10 | 親同値指定は可 | L1 | 矛盾解消 | P3/P8表現統一 | shared/orchestrate/delegation-contract.md |
| delegation:10 | 無自覚な継承は禁止 | L1 | 矛盾解消 | P3/P8対象 | shared/orchestrate/delegation-contract.md |
| delegation:10 | 能力とコストで選ぶ | L1 | L1 | 配置判断 | — |
| delegation:10 | 利益が受入費を上回る時だけ | L1 | L1 | 過剰委譲防止 | — |
| delegation:14 | 並列作業の語義を限定 | L1 | L2 | 用語詳細 | shared/orchestrate/composition.md |
| delegation:15 | 独立TODO複数なら並列検討 | L1 | L1 | 着手判断 | — |
| delegation:15 | 直列選択も許可 | L1 | L1 | 強制化防止 | — |
| delegation:15 | 結論をcampaign一回記録 | L1 | L1 | 再検討防止 | — |
| delegation:15 | 単一TODO executorは対象外 | L1 | L1 | 適用境界 | — |
| delegation:16 | campaign内部は追加WIPでない | L1 | L1 | WIP解釈 | — |
| delegation:16 | WIPだけで直列化しない | L1 | L1 | 誤直列化防止 | — |
| delegation:16 | 直列化理由を限定 | L1 | L1 | 判断条件 | — |
| delegation:17 | 同repo複数writerはLattice | L1 | L1 | writer起動gate | — |
| delegation:17 | 交差を親だけで判定しない | L1 | L1 | writer安全 | — |
| delegation:17 | independence/compileへ委ねる | L1 | L2 | CLI詳細 | shared/orchestrate/composition.md |
| delegation:17 | 別repo等は対象外 | L1 | L1 | 適用境界 | — |
| delegation:17 | 専用worktree条件は維持 | L1 | L1 | 安全契約 | — |
| delegation:17 | 直列化正本はcomposition | L1 | L1 | 正本ポインタ | — |
| delegation:18 | 既存runを先に確認 | L1 | L2 | CLI手順 | 新設要 |
| delegation:18 | active TODOを二重dispatch禁止 | L1 | L1 | 重複防止 | — |
| delegation:18 | 中断runはresume | L1 | L2 | CLI手順 | 新設要 |
| delegation:18 | 不継続runはabandon | L1 | L2 | CLI手順 | 新設要 |
| delegation:18 | runとtodo能力を混同しない | L1 | L2 | CLI差異 | 新設要 |
| delegation:19 | Lattice不能時は直列化 | L1 | L1 | supported縮退 | — |
| delegation:19 | 自前並列で回避しない | L1 | L1 | fail closed | — |
| delegation:19 | 断念理由を一度記録 | L1 | L1 | 判断証跡 | — |
| delegation:19 | 旧L7留保の経緯 | L1 | L2 | 履歴詳細 | docs/adr/0113-composable-orchestration-invariants.md |
| delegation:21-23 | [gate] Packetは8点必須 | L1 | L1 | exact見出し検査 | — |
| delegation:25 | Packet①対象scope | L1 | L1 | 委譲必須情報 | — |
| delegation:25 | Packet①git操作禁止 | L1 | L1 | 委譲必須情報 | — |
| delegation:26 | Packet②挙動差と承認 | L1 | L1 | 委譲必須情報 | — |
| delegation:27 | Packet③仕様と成功条件 | L1 | L1 | 委譲必須情報 | — |
| delegation:27 | 根拠を着手直前に再読 | L1 | L1 | stale防止 | — |
| delegation:28 | Packet④固有の罠 | L1 | L1 | 委譲必須情報 | — |
| delegation:29 | Packet⑤characterization | L1 | L1 | 委譲必須情報 | — |
| delegation:29 | 欠陥らしき差は報告へ分離 | L1 | L1 | scope逸脱防止 | — |
| delegation:30 | Packet⑥検証コマンド | L1 | L1 | 委譲必須情報 | — |
| delegation:30 | 全greenを成功条件 | L1 | L1 | 受入条件 | — |
| delegation:31 | Packet⑦前提を再検証 | L1 | L1 | 鵜呑み防止 | — |
| delegation:31 | 食違いは理由付き報告 | L1 | L1 | 方針逸脱防止 | — |
| delegation:32 | Packet⑧Report項目 | L1 | L1 | 委譲必須情報 | — |
| delegation:34-36 | [gate] Report受入見出し | L1 | L1 | exact見出し検査 | — |
| delegation:36 | 報告を採用宣言に替えない | L1 | L1 | 親裁定 | — |
| delegation:36 | diff等を親が再検証 | L1 | L1 | 親裁定 | — |
| delegation:36 | 関連gateを親が再実行 | L1 | L1 | 親裁定 | — |
| delegation:36 | 発見を正本へ還流 | L1 | 矛盾解消 | P7書込scope | shared/orchestrate/delegation-contract.md |
| delegation:38 | rejectは受入棄却だけ | L1 | L1 | 状態境界 | — |
| delegation:38 | import後rejectはRun終端 | L1 | L1 | 状態境界 | — |
| delegation:38 | import前は同一Runで再作業 | L1 | L2 | retry詳細 | shared/orchestrate/control-record.md |
| delegation:38 | import後は新Runを作る | L1 | L2 | retry詳細 | shared/orchestrate/control-record.md |
| delegation:38 | rejected Runを再利用しない | L1 | L1 | 履歴不変 | — |
| delegation:38 | blockerは証拠条件付き | L1 | L1 | blocker判定 | — |
| delegation:38 | Task取消は別Decision | L1 | L1 | 状態境界 | — |
| delegation:40 | 外部terminalを推測しない | L1 | L1 | 状態契約 | — |
| delegation:40 | timeoutは同一handle回収 | L1 | L1 | 重複防止 | — |
| delegation:40 | H等をPacketに含めない | L1 | L1 | 権限境界 | — |
| delegation:40 | 外部入力はuntrusted | L1 | L1 | prompt安全 | — |
| delegation:40 | [gate] 秘密類をpromptへ渡さない | L1 | L1 | exact安全契約 | — |

## 集計

字数はUTF-8バイト数ではなく、改行を含む文字数。

| 集計面 | 現在 | 提案後概算 |
|---|---:|---:|
| `shared/constitution.md` | 7,054字 | 約3,900字 |
| ルート`AGENTS.md` | 11,197字 | 約1,700字 |
| `PLAN.md` | 5,421字 | 約1,600字 |
| 論理的L0合計 | **23,672字** | **約7,200字** |
| 削減率 | — | **約70%減** |

厳密なruntime自動読込だけをL0と数え、通常リンクの`PLAN.md`を除く場合:

- 現L0: **18,251字**
- 提案後: **約5,600字**
- 削減率: **約69%減**

概算には、残す規則の肯定制限文化、L1/L2ポインタ、見出しを含む。P1〜P8の最終文言と、現在受け皿がない「Lattice工程運用」「RAG還流runbook」「規範authoring」「repo終活」の新設面によって±10%程度変動する。
