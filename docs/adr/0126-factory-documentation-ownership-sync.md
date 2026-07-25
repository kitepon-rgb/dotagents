# ADR 0126: 工場全文書の所有境界同期

- Status: accepted
- Date: 2026-07-26
- Plan: `factory-master` `fm-0680`〜`fm-0686`

## 事実

- 開発工場はdotagents、自作コアは10製品、MarkItDownは公開CLIだけをblack-box管理する第三者製品である。
- Observer編入完了後も、一部の現役文書には旧製品数、旧wire、未完release、承認待ちが残っている。
- 製品repoごとの正典と公開READMEも別時点の状態を保持しており、工場横断の現在形と整合していない。
- 歴史文書を現在基準で書き換えると、当時の裁定・受入証拠・release履歴を破壊する。

## Decision

1. dotagentsと自作コア10製品の現役文書を同じwaveで同期する。
2. 工場横断の所有境界はdotagents、製品固有の契約・公開状態は各製品repoを正本とする。
3. 完了済みplan、ADR、証拠、release noteは履歴として保持し、現在入口にだけ失効・後続正典の導線を置く。
4. MarkItDownのrepo・内部実装は変更せず、第三者管理区分の表記だけをdotagents所有文書で揃える。
5. 発見した自作コア製品のP0/P1欠陥は同じPhaseで根治し、製品repoのrelease gateに従って届ける。

## レーン裁定

このwaveは複数repoの書込みを調整し、所有境界裁定の検証可能な証跡を要するため統括レーンとする。
計画済み中断はなく、文書受入はrepo別gateから全体監査へ連鎖する。

## 帰結

進捗正本はLattice `factory-master`、統括証跡はControl
`factory-documentation-sync-20260726`、目的・非目標・受入条件は
`docs/plan_factory-documentation-sync.md`に分離する。全repoのcommit・pushとclean監査までを完了条件とする。
