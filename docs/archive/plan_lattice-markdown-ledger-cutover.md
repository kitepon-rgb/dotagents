# Lattice Markdown台帳切断・transactional source cutover計画（完了）

日付: 2026-07-19

## 目的

Latticeへ登録済みの工程と、`docs/plan_*.md`に残るGFM checkbox進捗台帳の二重正本を物理的に断つ。
工程の状態・依存・追加・削除・完了証拠はLatticeだけが所有し、Markdownは思想、背景、非目標、
受入条件、判断理由を説明する文書へ限定する。

## 成功条件

1. Latticeの公開authoring transactionが、**ToDo単位**のsource cutover操作
   （task ID、元Markdown断片、source anchor、archive先、live側置換）をrevision intentへ
   digest-boundで含める。1 transactionは複数のper-ToDo操作をbounded batchとして束ねてよい。
   ファイルはpublish実装上の集約単位にすぎず、契約単位にしない。
2. 通常エラーではstore・archive・live sourceのbytesがすべて不変になる。process crashで段階的な
   publishが発生しても、同じrevisionの再実行だけで同じ終状態へ収束し、別bytesへのfallbackをしない。
3. dotagentsのLattice登録済み8計画は、各ToDo断片を`docs/archive/`のplan別凍結台帳へ退避し、live pathには
   思想・背景・非目標・受入条件だけを残す。既存Controlのobjective refと文書間linkを破断させない。
4. 各ToDoのdispositionが`archived`／`retained-narrative`／`excluded`のいずれかへ一意に確定し、
   source inventory、task migration、cross-plan dependency、narrative anchor、archive fragment digest、
   live replacement digestを同じsuccessor revisionで検証する。batch内の1件でも不正ならbatch全体を
   無変更で拒否し、batch間はpredecessor revision digestで順序と二重適用を拘束する。
5. lint／CIが、Lattice登録済みlive planへのGFM checkbox再導入と、MarkdownからLatticeへの暗黙同期を
   拒否する。
6. Latticeのfocused／related／full gate、dotagentsのfocused／CI、実dotagents storeのverify／status／
   ganttがgreenとなる。
7. 修正版Latticeをversion bump、NPM publish、global installし、registry版で公開後smokeを通す。

## 契約境界

- F: revision schema、source cutover state machine、crash recovery、manifest activation順、archiveの不変性、
  source binding、公開CLI、rollback。
- A: Fで固定した契約に従う実装、fixture、文書変換、lint。
- H: NPM publish、global install、push。publishとglobal installは工場コア製品の恒久裁定に従い、実行直前に
  目的・影響・rollbackを再掲する。pushはオーナーの明示指示時だけ行う。

## 実行順

1. 現行revision transactionとsource inventoryをcharacterizationし、ToDo単位の失敗・crash境界を
   red testで固定する。
2. Lattice ADRでper-ToDo cutover intent、bounded batch、plan別archive ledger、live replacement、
   同一file内の複数編集の集約publish、recovery順、idempotencyを裁定する。
3. Lattice本体とCLIへtransactional source cutoverを実装する。
4. dotagentsの規範、lint、fixtureを新しい単一正本契約へ更新する。
5. 新機能を使う最初の実transactionとして、708 source ToDoを8計画ごとのbounded batchで全数裁定し、
   ToDo断片だけを凍結archiveしてlive Markdown台帳を除去する。
6. 独立反証、full gate、evidence、Control finalization、releaseを閉じる。

## 並列化裁定

Lattice transaction実装とdotagents移行は公開schemaと実fixtureで強く結合し、8計画もcross-plan参照を持つ。
同一repo並列writerは使わず、Lattice実装→公開契約受入→dotagents移行の順に直列化する。read-only反証だけを
契約確定後に独立実行してよい。

## 非目標

- Markdownの思想・背景・受入条件をLattice task labelへ押し込まない。
- Git履歴だけをarchiveの代用品にしない。
- source Markdown全体をarchive単位にしない。思想・説明・受入条件はlive文書へ残す。
- 複数filesystemや複数repoをOSレベルの単一renameでatomicに見せない。durable intentと同一revision再実行に
  よる回復可能transactionとして契約する。
- archive済みcheckboxを再抽出してtaskへ復活させない。
- WebAICodingが所有する`polish-github`変更と、端末ローカルな`codex/rules/default.rules`を本作業へ含めない。

## 検証

- Lattice: revision/source-cutover focused tests、todo CLI tests、`npm run ci`、pack/install smoke。
- dotagents: registered live plan checkbox lint、link/Control objective ref、`lattice todo verify/status/gantt`、
  `make ci`。
- crash matrix: per-ToDo検証前、archive ledger durable後、live replacement後、manifest activation前後、
  cleanup前。同一file内の複数ToDoは全件反映または全件不変を確認する。
- rollback: Lattice packageは直前versionへglobal reinstall。dotagents migrationはrepo別revertでstore successorと
  archive/live文書を同時に戻す。
