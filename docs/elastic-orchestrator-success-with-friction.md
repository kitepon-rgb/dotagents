# Elastic Orchestrator TODO完了時の運用摩擦確認 decision

Date: 2026-07-15

Status: Accepted

## Context

Observer dogfoodで、native Workerの報告内容は意味的に正しかったが、nested evidence／validation shapeが
`dotagents.worker-report.v1`と一致せず、親がmanual normalizationしてからstrict importを通した。
最終importは安全に成功したため、これを親の通常受入作業と誤分類し、オーナーに問われるまで製品TODOへ登録しなかった。

既存契約はimport失敗をfail closedにできる一方、親がimport前に報告を補正した事実をControlから観測できない。
最終成功だけを完了判定にすると、証拠再構成や代替回収のような標準経路外の介入が欠陥として残らない。
一方、Runごとのreceiptや専用schemaを追加すると、監査・回帰テストの頻度をTODO単位へ抑える方針に反して
運用コストを増やす。

## Decision

- TODO完了候補時に一度だけ、親は標準経路外の手補正・証拠再構成・代替回収の有無を確認する。
- 有った場合は、最終結果が成功でも握り潰さず、本筋へ戻る前に欠陥を所有するrepoの`docs/`正本TODOを
  登録するか、既存TODOへの具体的な参照を残す。
- 工場コア製品の正規入口で再現した欠陥は、既存裁定どおり独立gate／独立commitで修正してから本筋へ戻る。
- この確認のための専用receipt、Control schema、Run state、個別testは追加しない。
- 同じTODOへの確認や独立監査を反復せず、既存のTODO単位監査へ含める。

## Consequences

- 「作業が止まったか」ではなく「標準経路だけで完遂したか」が欠陥登録の判定になる。
- 自動観測できない親の介入は、TODO完了時の一回確認で拾う。
- 実装・token・テスト時間の恒常コストは増やさない。同じ取りこぼしが再発した時だけ機械化を再検討する。
