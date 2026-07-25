# 開発工場 全文書同期計画

**状態:** Active  
**作成日:** 2026-07-26  
**対象:** dotagents、自作コア10製品の正規repo

## 目的

開発工場の現役文書を、現在の所有境界と製品状態へ同期する。工場はdotagents、自作コアは
Caveat／Throughline／Spotter／Lattice／gpt-connector／aiterm-mcp／codex-sidecar／AIShell／
Observer／ServerManagerの10製品、MarkItDownは公開CLIだけをblack-box管理する第三者製品である。

## 判断

- 各repoの公開README、正典、現役運用文書、現在状態を説明する文書を更新対象とする。
- 完了済みplan、ADR、証拠、release note等の歴史文書は当時の事実を保持し、現在形の入口として
  誤読される場合だけ失効・後続正典への導線を加える。
- 製品固有の契約は各製品repo、工場横断の所有境界とintegration contractはdotagentsを正本とし、
  全製品一覧を各repoへ機械的に複製しない。
- MarkItDownは第三者製品なので、そのrepoや内部実装は変更しない。
- 文書だけで新しい製品挙動、release、deployを発生させない。

## 非目標

- 製品コード、設定schema、runtime、公開packageの変更
- 歴史文書の現在基準による書き換え
- 第三者製品MarkItDownのfork、patch、release

## 受入条件

- dotagentsと自作コア10製品の現役文書に、現在の所有区分・製品数・公開状態と矛盾する記述がない。
- dotagentsの現役計画に残る完了済み承認待ち・旧製品数・旧wire状態を解消する。
- 各repoの文書検証を通し、対象変更だけをrepo別にcommit・pushする。
- 対象11 repoに未コミット変更、未push commit、未処理stash、承認待ちを残さない。

## 工程正本

Task、依存、状態、完了証拠の唯一の正本はLattice `factory-master` planの
`fm-0680`〜`fm-0686`である。工程表示は `lattice todo gantt --scope live` で生成する。
本書は目的、判断、非目標、受入条件だけを所有し、進捗checkboxを持たない。
