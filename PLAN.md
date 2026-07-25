# 開発工場の憲章（全端末・全プロジェクト）— 聖典 v4

原則1〜10 の番号・骨子は不変（他リポ・グローバル共通憲法が番号で参照する生きた参照）。

## 趣旨

dotagents は**開発工場そのもの**。全プロジェクトに共通して効く土台と、そのコア製品群の統合責務を持つ:

- **規範**: ベルの共通憲法（`shared/constitution.md`正本＋host delta）・本憲章の原則・orchestrate（統括の型）・02_models.md（役割→モデル対応の唯一の参照点）・01_project-layout.md（フォルダ構成標準）
- **同期ハブ**: install.sh が skill / command / agents / rule / bin / 罠DB を全端末へ symlink 配布。GitHub が真実の源
- **知識台帳**: rag/（調査の複利棚）・docs/（決定と計画）。罠DB は Caveat 自身が管理（`~/.caveat/own` → private の Caveat-Private・v0.15+。dotagents 外）
- **工場管理対象11製品**: 自作コア10製品＝Caveat（罠知識）・Throughline（セッション継続）・Spotter（未使用ツール監査）・Lattice（工程graphとコード構造理解）・gpt-connector（ChatGPT接続）・aiterm-mcp（PTYと外部モデル枠）・codex-sidecar（Claude親からのCodex実行）・AIShell（macOS native開発面）・Observer（親watchと監査）・ServerManager（中央運用管理）。MarkItDownは自作コアではなく、公開CLIだけを使う第三者管理製品。LatticeはCodegraphを完全吸収した正式後継で、独立Codegraphはretired／not_applicableの履歴だけを保持する。Claude Code CLI・Codex CLI・Grok Buildは基盤toolchain、Oracleはv1互換・rollback専用。BugHubはServerManager内部コンポーネント（[Lattice編入記録](docs/archive/plan_lattice-factory-integration.md)・[Observer編入記録](docs/archive/plan_observer-core-integration.md)）。

**範囲**: 本旨は「開発工場（環境）の最適化」。個々のプロダクトの品質監査・法務チェック・深いバグ探しは範囲外——それは「工場で作る製品の検品」であり、オーナーが個別に依頼した時だけ行う。各プロジェクトへの介入は原則、①GitHub 同期 ②フォルダ構成の標準化 ③CLAUDE.md ブラッシュアップ ④Spotter のproject-scoped有効化に絞る。Spotterは全projectで無条件発火させず、正規CLIが作るmarkerで対象を限定する。

## 原則（番号は生きた参照＝変更禁止）

1. **最上位知能の使い所は3種だけ**: ①判断が資産として残る作業（監査・敵対的検証・裁定） ②構造の敷設（安全網・CI・規約・テンプレ） ③翻訳（弱いモデルでも従える契約・手順への落とし込み）。仕様が固まった実装は安価モデルで足りる——物量は外部枠・安価枠へ委譲し、統括は仕様＋罠リスト＋検証コマンドの作成・裁定・diff レビュー・コミット/push に絞る（委譲契約は`shared/orchestrate/delegation-contract.md`、配置は`docs/02_models.md`が正）。
2. **GitHub が真実の源**: プロジェクトは端末を跨いで存在する。**全てのプロジェクト作業は fetch→照合→整合させてから**。作業後は必ず push で真実を返す。
3. **リポ内知識 ＞ 端末ローカル記憶**: プロジェクトの真実（設計・手順・規約）は repo の CLAUDE.md / docs / rag に置く。端末メモリ（`~/.claude/projects/*/memory`）は端末固有・私的な文脈だけ。
4. **全リポを残す前提を置かない**: 終わったプロジェクトはローカルから消してよい。ただし**削除の決定は必ずオーナーに提案→承認**（AI が勝手に消さない）。安全判定は「定常運用」の終活手順に従う。
5. 各タスクにラベル: **F**=最上位品質が要る／**A**=安価モデル＋契約で可／**H**=人手（ログイン・削除承認等）。
6. **自作資産の終活**: 自作 skill / command / rule / 契約は、作成時期を問わず現行 Claude のネイティブ能力と突合してから残す。突合で負ける資産は延命せず廃止を提案する（廃止承認は常に H）。**見直しのトリガーはオーナー**——モデル世代交代の時期はオーナーだけが観測・宣言できる。資産見直しのカレンダー駆動はしない（判断の定期化は形骸化する。判断を要しない機械的衛生作業＝メモリ棚卸し・rag Lint は月次で回してよい）。見直しを安くするため、各資産の冒頭に**前提行**を1行仕込む（例: `前提: Fable級統括／Sonnet級実装者（2026-07 時点）`）——宣言が出た瞬間、次のモデルが grep で再検討対象を機械列挙できる。
7. **依存は「窓」に限定し、「真実の保存」には置かない**: 類似機能の完全自作より保守された外部パッケージ依存の方が安い——ただし依存を置いてよいのは交換可能な「窓」（ビューア・UI・変換器）まで。**知識・判断・規約の保存層は素の Markdown＋git**（依存ゼロ・全モデル可読・端末横断）。根拠: 窓は流行が去れば替えればよいが、器に真実を入れると人質になる。適用例——Obsidian: 窓として採用可（`.obsidian/` は端末固有につき gitignore）。NotebookLM: 器なので主脳不可・一方通行の人間用窓のみ可。プラグイン: ネイティブ機能で上位互換できるなら新規導入しない。詳細根拠: `rag/second-brain/`。
8. **重い検証構造（多視点Find→Dedup→指摘ごとの反証→Critic）は統括レーンの契約クリティカルだけ**（頻度と範囲は`shared/orchestrate/contract.md`「監査の頻度」が正）。Phase完了時の検証は原則クロスprovider（Claude親→Codex、Codex親→Claude）。もっともらしい指摘・提案ほど反証にかけ、確信できないものは棄却する。
9. **モデルはバージョン固定禁止**: latest 型で指定する。役割→現行最強の対応表 **docs/02_models.md** を唯一の参照点にし、各所にモデル名を書き散らさない。役割の骨格: 統括=現行最強推論／実装=安価高速枠／反証=強推論枠／外部併走=レート非依存の他社枠。
10. **知識は還流させて育てる（第二の脳）**: 調査・研究を使い捨てにしない。外部仕様・文献は rag/ に固定し、**出力（回答・監査ダイジェスト・図解）も rag/ に還流**して複利で育てる。運用規約: ①`rag/<topic>/raw/` に一次ソース（markitdown 等で変換。取得系の罠は caveat が正）②LLM が要約・[[リンク]]・概念記事へコンパイル（wiki の保守は LLM の仕事）③`rag/INDEX.md` に1行台帳（出典・取得日・確度）④定期 Lint（月次・メモリ棚卸しと同枠）⑤選球眼——何を入れないかが質を決める ⑥人間用の窓は Obsidian（真実の源を二重化しない）。

## 文書の作法

- **文書は3種に分類して管理する**: ①**趣旨**（本憲章・各リポの正典＝なぜ・何のため） ②**プラン**（統括レーンの目的・判断理由・非目標・受入条件とLattice工程への導線） ③**役目を終えたもの**（実現済みプラン・完了台帳）。
- **統括レーンのプランはプロジェクトの docs/ に作る**。通常レーンは会話上の成功条件または内蔵planで足り、会話・端末メモリ・`~/.claude/plans` を工程正本にしない。
- **実行TODOの正本はLattice typed discoveryで決める**: `lattice status --json` が`ready`／`active_run`ならtask・依存・状態・完了証拠はLattice storeだけに置き、Markdown checkboxへ二重化しない。`invalid`をMarkdownへfallbackさせない。Latticeを導入しない場合だけMarkdownを正本とする。
- **役目を終えた文書は docs/archive/ へ退避**し、docs/ 直下は生きた文書だけに保つ。本憲章の旧版は [docs/archive/2026-07_plan-v3-fable-era.md](docs/archive/2026-07_plan-v3-fable-era.md)。
- **時間見積を計画の制約・判断材料にしない**（AI の作業時間見積は実際の約20倍過大）。計画は順序・依存関係・承認ゲート（H）だけで組む。
- 全端末で読む文書は**端末非依存・絶対日付・方針は理由ごと本文に**（「会話で決めた」「メモ参照」禁止＝根拠そのものを書く）。
- **方針級の発見はその場で正典へ**。書き先の振り分け: 方針と理由=本憲章／全プロジェクト共通の作法=`shared/constitution.md`／Claude・Codex固有作法=各host delta／プロジェクト標準=01_project-layout.md／再現可能な外部罠=caveat／調査事実=rag/。迷ったら本憲章に書いてから移す。

## 定常運用

- **同期掃引（sync-sweep）**: プロジェクト作業は sync-sweep green から始める。`bin/sync-sweep.sh`（全端末配布）が全リポの fetch→ahead/behind・dirty・unpushed・**stash 数（status に出ず push でも運ばれない）**・迷いブランチ・既定ブランチ名・NO_REMOTE・gitignore された非追跡ファイル・**開発ルート直下の非 git ディレクトリ**を台帳出力する。掃引台帳はキャンペーン単位＝docs/ に起票し、閉じたら archive（[adr/0003](docs/adr/0003-campaign-close-plan-todo-merge.md)）。
- **リポの終活トリアージ**: 分類は「継続／休眠／削除候補」。**「休眠」は端末単位の状態であってプロジェクトの生死ではない**——生死はオーナー宣言でのみ決まる（AI がローカルの鮮度から推定しない）。削除承認は常に H・端末ごと。**安全に消せる条件（全て満たす）**: remote あり・全ブランチ push 済み・dirty ゼロ・`git stash list` 空・gitignore された貴重物（.env/鍵/ローカル docs/CLAUDE.md 類）なしを実走査で確認。**どれか欠けたら救済してから**: dirty はコミット・stash はブランチ化・gitignore 貴重物は `git add -f`（鍵・.env だけは push せず tar 退避）→ 再走査 → 削除。GitHub 側は削除でなく `gh repo archive`。
- **週次**: `agents-update` の常設（全端末必須。手順は README「自動アップデート」節が正）。
- **月次**: メモリ棚卸し（orchestrate references の bulk-curation）＋ rag/ Lint（原則10-④）。
- **世代交代時**: オーナーが宣言 → 02_models.md の解決例列を更新して push → `grep -rn "前提:"` で旧世代前提の資産を原則6で再検討（手順の正は 02_models.md）。

## 残件

- 工程正本: Lattice plan `factory-master`。[開発工場 統合マスター計画](docs/plan_factory-master.md)は目的・判断・受入条件とLattice工程への導線だけを持ち、本憲章へ個別TODOを重複させない。
