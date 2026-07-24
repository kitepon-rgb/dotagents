# ADR 0119: wire v5設計正本の確定と、独立反証による事実認定の訂正

- Status: accepted
- Date: 2026-07-25
- 対象: wire v5の固定製品集合、major境界の根拠、expectation matrix、compatibility、rollback、非目標
- Phase: `aishell-factory-integration` / `p0-design`（gate policy `design-refutation`）

## 事実

- BugHub v2 schemaはproductsに14キー定義／12必須で、`lattice`と`aishell`をoptional keyとして受理する。v4 schemaは12キー定義・`additionalProperties: false`で`aishell`のスロットを持たない。dotagents clientも`exactKeys(report.products, V4_PRODUCT_IDS)`で13個目のキーを拒否する。
- A3で入れたAIShellのserver-first optional登録はv2 schemaにだけ存在し、wire v4 cutoverの時点で観測面から消えていた。現役wireでAIShellは構造的に席が無い。
- `bughub/src/factory-ingest.js`の`ingestFactoryReportV4`は`save: db.saveFactoryReportV2`を使い、`saveFactoryReportV2`は`applyFactoryIssues(..., 'v2')`を呼ぶ。**wire v4のreportは`version='v2'`として期待値評価される。**
- `factoryExpectation()`のv2分岐は`['lattice','aishell']`を無条件に`optional`へ落とす。コード上のコメントは「Latticeはv4でenroll済み」と書くが、v4がv2として評価される以上その意図は実装されていない。
- BugHub live matrix（2026-07-25実測）で`fox-wsl`の`lattice`は`missing`だが、expectation issueは1件も存在しない。
- `applyFactoryIssues`は期待値`required`の時、`installed`でのみresolveする。`not_applicable`はresolveされずhigh issueになる。
- v4は`factory_v2_reports` / `factory_v2_observations` / `factory_v2_current`をv2と共有する。major別に分離していない。
- 初版の設計正本は「`factoryExpectation()`にv4分岐が無く全製品がrequiredへfall-throughし、grok-buildがmain-serverで偽warnを出している」と記述した。独立反証（Grok 4.5、cross-provider）がこれを否定し、親が実コードで再確認して**誤りと確定した**。

## Decision

1. **wire v5は固定13製品（v4の12＋`aishell`、required）とする**。順序を含めv4の12製品を保持し、`schema_version="5.0"`、endpoint `POST /api/factory/v5/reports`とする。v2 / v4のproduct set、schema、受入証拠は変更しない。
2. **major新設の根拠は「純B案が物理的に不可能」までとし、「唯一」を無条件に主張しない**。凍結を守ってexpectation matrixだけで昇格させる案はschemaとclient validatorが物理的に塞ぐ。一方、v4 schemaへoptional keyを後から足すB′案は物理的には可能であり、それを封じているのは凍結方針である。**物理的不可能と政策的棄却を混同しない**。
3. **`required` + `not_applicable`をissueにしない挙動は、既存意味論ではなくv5が要求する実装変更である**と明記する。現行実装はhigh issueを作る。AIShellはApple Silicon専用であり、Intel Macが加わればmac profileのまま`not_applicable`を報告するため、この変更が必要になる。既存の性質として書かない。
4. **実在する乖離は`lattice`と`codex-cli` windows-nativeの2件であり、v5分岐追加と同一波で修理する**。`lattice`はwire v4で必須製品へ昇格したのに実効値が`optional`のままで、`fox-wsl`の欠落が黙って見逃されている。v5で`aishell`を昇格させる際、`['lattice','aishell']`の無条件optional分岐を残せば同じ罠を再生産するため、分岐設計自体を直す。**初版が挙げた乖離2件（grok-build、claude-code windows-native）は存在せず、この記述は撤回する。**
5. **v5のstorageはv2 / v4と同じ面を共有する**。v4が既に共有しており、「major別に分離する」は実態でも先例でもなかった。初版の記述を撤回する。
6. **v3番号はObserver予約の未実装番号として温存する**。client / serverどちらにも実装が存在せずv4が飛び越えて着地している。v5はこの番号を再利用せず、Observerを扱わない。
7. **反証は単一providerレーンで閉じた**。規定入口のcodex-sidecarはオーナーの対話Codexセッション5本がauth leaseを保持して起動できず、それらを落とさない判断をした。ChatGPTレーンは製品自体が停止しており（wv5-0860で修理）、修理後の再試行も長文promptのruntime timeoutで完了しなかった。**指摘は一件ずつ親が実コードで再確認しており、事実認定の裏取りはproviderの票数でなく実装読解で担保している。**

## 帰結

`docs/wire-v5-design.md`の§1・§3・§4・§5を改訂し、§4は全面書き換えとした。撤回した記述は本文にも明示している。P1（BugHub v5実装）は本ADRのDecision 4に従い、`factoryExpectation()`のv5分岐と既存乖離2件の修理を同じ受入単位で扱う。
