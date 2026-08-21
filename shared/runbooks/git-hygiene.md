# Git hygiene

所有: dotagents所有・全project向けL2正典。

rsync dry-run・grep単独禁止・repo終活安全判定・sync-sweepの詳細を扱う。

## コミットとrepo所有の作法

- **複数行のコミットメッセージは `-F <file>` で渡す**。PTY へのインライン複数行 `-m` は引用崩れする。
- **自作repositoryのownerは公開段階で分ける**。プロトタイプ段階は個人account `quolu` に置き、オーナーが正式リリースと扱う時点で `kitepon` Organizationへ移管する。正式リリース後の正規repositoryは `kitepon/<repository>` とする。

## 削除・移行前の安全確認

- **`rsync --delete` の前に必ず `-n -v` の dry-run** で「削除一覧」と「秘密混入」を確認する。**gitignore 済みファイルは git status に出ない＝消失に気づけない**。
- 削除前の「消費者ゼロ確認」を **grep 単独に頼らない**（バイナリ判定されたファイルを黙ってスキップする）。Lattice sensor等の索引を併用する。
- リポジトリの削除・移行・リモート乗換の前に、status に出ない資産と移送不能を疑う（stash・shallow clone 等。個別の罠と対処は caveat が正）。

## sync-sweep（同期掃引）

プロジェクト作業はsync-sweep greenから始める。`bin/sync-sweep.sh`は全repoのfetch、ahead/behind、dirty、unpushed、stash数、迷いブランチ、既定ブランチ名、NO_REMOTE、gitignore済み非追跡ファイル、開発ルート直下のnon-git directoryを台帳出力する。掃引台帳はcampaign単位で`docs/`に起票し、完了後はarchiveする。

## リポ終活トリアージ

分類は継続・休眠・削除候補とする。休眠は端末単位の状態であり、生死はオーナー宣言だけで決める。削除承認は常にHかつ端末ごとである。削除できるのはremoteあり、全branch push済み、dirtyゼロ、stash空、gitignoreされた貴重物なしを実走査で確認した時だけ。欠ける場合はdirtyをcommit、stashをbranch化し、gitignoreされた貴重物（.env・鍵・ローカルdocs/CLAUDE.md類）は`git add -f`で収容する。鍵・.envだけはpushせずtar退避してから再走査し、GitHub側は削除でなく`gh repo archive`を用いる。
