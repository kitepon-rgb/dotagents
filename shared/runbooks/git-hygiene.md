# Git hygiene

所有: dotagents所有・全project向けL2正典。

rsync dry-run・grep単独禁止・repo終活安全判定・sync-sweepの詳細を扱う。

## 削除・移行前の安全確認

- **`rsync --delete` の前に必ず `-n -v` の dry-run** で「削除一覧」と「秘密混入」を確認する。**gitignore 済みファイルは git status に出ない＝消失に気づけない**。
- 削除前の「消費者ゼロ確認」を **grep 単独に頼らない**（バイナリ判定されたファイルを黙ってスキップする）。Lattice sensor等の索引を併用する。
- リポジトリの削除・移行・リモート乗換の前に、status に出ない資産と移送不能を疑う（stash・shallow clone 等。個別の罠と対処は caveat が正）。
