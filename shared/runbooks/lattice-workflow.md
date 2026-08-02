# Lattice workflow

所有: dotagents所有・全project向けL2正典。

工程正本判定・cutover・run運用の詳細を扱う。

## 工程正本の判定と運用

- **工程正本はLatticeのtyped discoveryで決める**: projectで工程を読む／作る前に`lattice status --json`を実行し、
  `.lattice/`の有無を接続判定へ使わない。`ready`／`active_run`ならtask、依存、状態、完了証拠の正本はLattice
  storeだけであり、Markdownへ二重化しない。`invalid`はエラーとして止め、Markdownへfallbackしない。
  `uninitialized`は利用可能な未初期化状態であり、plan導入が作業scopeなら返された`next_action`から
  `lattice plan create`を使う。Markdownを正本にするのは、Lattice CLIが利用不能か、未初期化projectで
  project方針／オーナー裁定により導入しない場合だけとする。統括plan Markdownは目的、思想、判断理由、
  非目標、受入条件、Lattice planへの導線を所有する。新規・変更ToDoはLattice authoring transactionで更新し、
  Markdown checkboxから移転する時はToDo単位のsource cutoverを同じrevision transactionへ含める。
  移転済みcheckboxをlive文書へ残したり、Markdownから暗黙再同期したりしない。役目を終えたplan・凍結台帳は
  `docs/archive/`へ退避し、`docs/`直下は生きた文書だけに保つ。
