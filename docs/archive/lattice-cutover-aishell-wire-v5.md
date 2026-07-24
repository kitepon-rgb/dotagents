# Lattice ToDo archive
Plan: aishell-factory-integration
Batch: wire-v5-a5-cutover
Revision: 7cb79dc67e6cce55f45097f3dd2f403c53790249ea07e84611c3436764bfb33c

- [ ] wire v5の固定13製品集合を正本化する。v4の固定12製品へ`aishell`をrequiredとして加えた集合とし、v2/v4のproduct set・schema・受入証拠は後付け変更しない
- [ ] v5 expectation matrixを`factory-host-product-matrix.md`の正本どおり明文化する。AIShellはmac=required、server/wsl/windows-native=unsupported。`not_applicable`をhigh欠落issueへ変換しない意味論も固定する
- [ ] v4 expectation実装と正本の乖離2件を裁定する。`factoryExpectation()`にv4分岐が無く、grok-buildが全profile required（正本はoptional。main-serverで偽warnが実発生中）、claude-code windows-nativeがrequired（正本はunsupported。現在は潜在）
- [ ] v4→v5のcompatibility契約を定義する。v4受理継続、issue identityの`host + product + fingerprint`共有、late v4 reportの巻戻し拒否、major別storage分離
- [ ] v5のrollbackとhost別退避経路を定義する。host単位でv4へ戻せること、outbox保持、v5 flag無効化でv4運用が無傷であること
- [ ] 非目標と既知の罠を固定する。v3番号はObserver予約の未実装番号として温存する。AIShellのpath・許可root・process引数・診断本文を送らない。暗黙fallbackを追加しない
- [ ] 独立refuterで設計を反証する。親と異なるproviderで実ファイルに当て、実在指摘だけをDedupして採否と理由を還流する
- [ ] `bughub/schemas/factory-report-v5.schema.json`を追加する。固定13製品required、`additionalProperties: false`、v4 schemaは変更しない
- [ ] `bughub/src/factory-contract.js`へ`V5_PRODUCT_IDS`と`validateFactoryReportV5`を追加する。privacy・semantic検証はv4と同一実装を共有する
- [ ] `POST /api/factory/v5/reports`を`FACTORY_V5_INGEST_ENABLED=true`明示時だけ公開する。既定404、v4受理とcredential契約は不変
- [ ] `factoryExpectation()`へv5分岐を実装する。fall-throughの`required`へ委ねず正本matrixどおり書き、A5-P0の裁定に従いv4分岐も処理する
- [ ] storage・dedupe・notificationをv5へ配線する。v4履歴を削除せず、issue identityを共有して二重issue・二重通知を作らない
- [ ] `factory-view.js`のaishell扱いをenrolled製品へ更新し、`db.js`のoptional固定分岐をv5でrequiredへ昇格させる。safe_context allowlistは空のまま維持する
- [ ] BugHub testを追加する。mac required充足、非対応hostのunsupported、`not_applicable`非issue化、未知product拒否、privacy negative、v4受理の非回帰
- [ ] BugHub full testとlintを通し、ServerManager repoへpathspec明示commitで閉じる
- [ ] `lib/factory/v5.mjs`を追加し、`contract.mjs`へ`V5_PRODUCT_IDS`と`validateReportV5`を加える。v2/v4の固定集合とvalidatorは変更しない
- [ ] `lib/factory/scan.mjs`の`aishellProduct`をv5 scanへ配線する。非対応hostでは構造的な`not_applicable`を出し、暗黙fallbackで塗り潰さない
- [ ] `factory-scan-v5.mjs`、`factory-reporter-v5.mjs`、`factory-reporter-v5-schedule-runner.mjs`を追加する。v5専用state namespaceを持ちv4 outboxを列挙しない
- [ ] `factory-reporter-scheduler.mjs`へ`--wire-major v5`を追加する。既存v1/v2/v4登録を壊さず`--dry-run`で変更範囲を提示する
- [ ] privacy fixtureとcontract testをv5へ拡張する。AIShellのpath・root・引数・診断本文が出ないnegative testと13製品exact keysのpositive testを含める
- [ ] `make ci`と`verify-install.sh --profile official`を通し、dotagents repoへpathspec明示commitで閉じる
- [ ] Macでv4 scanとv5 scanを同一時点で実行し、共通12製品のobservationが同値であることを差分で確認する
- [ ] v5 reportをclient検証器とserver検証器の両方へ通し、受理・拒否の判定と理由が一致することを確認する
- [ ] 非対応profileのv5 scanでaishellが構造的`not_applicable`になり、expectation issueを生まないことを確認する
- [ ] dual-run差分・privacy結果・非対応host挙動をevidenceへ固定し、本番deployへ進むかを裁定する
- [ ] deploy対象commitが`origin/main`の祖先であることを`git merge-base --is-ancestor`で確認する。祖先でなければ先にmainへ着地させる
- [ ] 【H】SQLite backupとrollback setを取得し、実在とサイズを確認する
- [ ] 【H】`FACTORY_V5_INGEST_ENABLED=false`のままv5対応revisionをdeployし、`/readyz`全checkとv4受理継続を確認する
- [ ] 【H】flagを`true`にして再deployし、本番container内canaryで13製品受理・未知product拒否・非対応host unsupported・safe_context空をDB書込みなしで確認する
- [ ] 【H】mac-kiteをv5へ切替え、初回full 13製品snapshotの受理とaishell=installedを確認する
- [ ] 【H】main-serverをv5へ切替え、aishell=unsupportedとgrok-build偽warnの解消を確認する
- [ ] 【H】fox-wslをv5へ切替え、aishell=unsupportedと既存codex-cli欠落issueが二重化していないことを確認する
- [ ] 【H】windows-workstationをv5へ切替え、aishell=unsupportedと基盤CLI expectationが正本どおりであることを確認する
- [ ] 4 host全てのBugHub matrixでv5 currentが揃い、v4 issueが二重化・巻戻ししていないことを確認する
- [ ] v4退役の判定基準（retention期間、全host v5安定、host別rollback不要の確証）を実測へ当てる
- [ ] 基準を満たす場合だけ旧v4 endpoint停止を裁定する。満たさない場合は据置理由と再評価条件を記録して閉じる
- [ ] wire v5の受入matrixを`docs/evidence/`へ作成する。実測値だけを載せ、gateが実際に捕まえた欠陥も隠さず記録する
- [ ] 不変ADRへwire v5のDecisionを固定する。固定13製品、expectation matrix、v4乖離2件の処理、退役裁定、棄却した代替案とその理由を含める
- [ ] 再利用可能な知識をcaveatとragへ還流する。「編入中製品のoptional key登録はwire majorを越えて継承されず、major cutoverで観測面から消える」という実測罠を必ず含める
- [ ] 本計画を`docs/archive/`へ退避し、`plan_factory-master.md`のAIShell行と成功条件を完了状態へ更新する
