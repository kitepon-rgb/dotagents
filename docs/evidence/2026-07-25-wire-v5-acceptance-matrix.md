# wire v5 受入matrix

- 日付: 2026-07-25
- plan: Lattice `aishell-factory-integration`（10 Phase / 48 ToDo）
- 決定: [ADR 0119](../adr/0119-wire-v5-design-canon.md)・[ADR 0120](../adr/0120-core-product-maintenance-wave.md)・[ADR 0121](../adr/0121-wire-v5-cutover-and-v4-retention.md)

実測値だけを載せる。gateが捕まえた欠陥と、私が壊して直したものも隠さず書く。

## 1. 成果

**AIShellが工場の観測面へ正式に載った。** A3で入れたserver-first optional登録は
v2 schemaにしか存在せず、wire v4 cutoverの時点で観測面から消えていた。
wire v5でAIShellが固定13製品のrequiredになり、4 host全てが切替わった。

| host | profile | aishell | 全現役製品のcontract |
|---|---|---|---|
| mac-kite | mac | `installed` 0.4.1 | 5.0 |
| main-server | server | `not_applicable` | 5.0 |
| fox-wsl | wsl | `not_applicable` | 5.0 |
| windows-workstation | windows-native | `not_applicable` | 5.0 |

退役済み`codegraph`だけが`contract_version=2.0`の`not_applicable`として履歴に残る。

## 2. 修理したコア製品

| 製品 | version | 内容 |
|---|---|---|
| Lattice | 0.12.9（公開） | Phase無し先行planからのcarryが素の`TypeError`で落ちる／v1・v2 phase revisionがmanifestの`active_revision_digest`を更新せず**storeが読めなくなる**／新規plan authoring入口の記述誤り／publish祖先gate導入 |
| gpt-connector | 0.4.9（公開） | `consult`が全呼び出しで失敗（上流が`sourceEvent.timeStamp`を無条件に読むようになった）／publish祖先gate導入 |
| BugHub | 本番deploy済み | wire v5実装／期待値の乖離2件／退役製品issueの永久残留／`contract_version`の不統一 |

## 3. 反証が設計を1つ救った

Grok 4.5によるcross-provider反証で、**設計正本§4の事実認定が全面的に誤りだった**ことが判明した。

初版は「`factoryExpectation()`にv4分岐が無く全製品がrequiredへfall-throughし、
grok-buildがmain-serverで偽warnを出している」と書いた。実コードを読み直した結果:

```
ingestFactoryReportV4 → save: db.saveFactoryReportV2 → applyFactoryIssues(..., 'v2')
```

**wire v4のreportは`version='v2'`として評価されており**、挙げた乖離2件はどちらも存在しなかった。

そして反証は**逆方向の本物の欠陥**を掘り当てた。v2分岐が`['lattice','aishell']`を
無条件`optional`へ落とすため、**wire v4で必須製品へ昇格させたはずのLatticeが永久にoptional**
だった。live実測で`fox-wsl`の`lattice`は`missing`なのにexpectation issueが0件。
**必須コア製品の欠落が4 hostのうち1台で黙って見逃されていた。**

修理後、cutover直後の初回v5 reportで`high` issueが新規に立った。

反証を通さなければ、この欠陥を温存したままv5でAIShellにも同じ罠を再生産していた。

## 4. gateが実際に捕まえた欠陥（7件）

規範を機械gateとして実装する価値の実測。

| # | gate | 捕まえたもの |
|---|---|---|
| 1 | publish祖先gate（Lattice） | 未push HEADからのpublish |
| 2 | publish祖先gate（Lattice） | `npm version patch`が更新した`package-lock.json`のcommit漏れ |
| 3 | publish祖先gate（gpt-connector） | 未push HEADからのpublish |
| 4 | `pnpm check`（gpt-connector） | gate script自身がeslintのNode globals不足で落ちる |
| 5 | version同期test（gpt-connector） | `src/version.ts`の追従漏れ |
| 6 | `verify-install`（dotagents） | 新規配布CLI 3本の未配布 |
| 7 | scheduler endpoint検査 | v4 endpointのconfigで`--wire-major v5`を指定した誤り |

## 5. 実行が捕まえた欠陥（testが見ていなかったもの）

mac-kiteのcutoverで初めてreporter binaryを実行し、2つの欠落が出た。

- `readAndValidateReportV5`が`contract.mjs`に無く、reporterがimport時に落ちた
- ack bundleの`schema_version`がwire majorへ追従するのに、v5 scanが出す`5.0`をv4 validatorが拒否した

**P2のtestはsource textとvalidatorしか見ておらず、binaryを実行していなかった。**
実運用が捕まえた。

## 6. 私が壊して直したもの

- **dotagentsのLattice storeを読めなくした**。v3で`reconciled`なmemberへ`phase_todo_revision.v2`を
  適用したところ`manifest_revision_binding_mismatch`でstoreが壊れた。gitの直前commitから復旧し、
  これをwv5-0850として同一waveで修理した。**修理後、同じ操作を実運用で通してstoreが健全なままである
  ことを確認した。**
- **`fox-wsl`のsymlinkを壊した**。windows-workstationで`bash ./install.sh`を実行したところ、
  同一物理マシンのWSL側で走り、link先をWindows repoへ張り替えた。検知して`fox-wsl`自身の
  repoから再installし復旧した。
- **設計正本§4の事実認定を誤った**（上記3）。反証で覆り、初版の記述を撤回して全面改訂した。

## 7. gate結果

| gate | 結果 |
|---|---|
| BugHub `node --test test/*.test.js` | **89/89**（実装前78 → +11） |
| dotagents `tests/wire-v5` | **8/8** |
| dotagents `tests/factory-reporter` + `tests/factory-scan` | **146/146** |
| dotagents `make ci` | exit 0 |
| dotagents `verify-install --profile official` | OK |
| Lattice `npm run ci` | exit 0 |
| gpt-connector `pnpm check` | exit 0、test 125/125 |
| 本番 `/readyz` | `ready`、6 check全pass |
| 本番container内canary | 9項目PASS、DB書込みなし |

## 8. 持ち越し

- **v4 endpointは据置く**。retention期間未経過。再評価条件はADR 0121に明記。
- **fox-wslはコア製品8種が欠落している**（caveat / throughline / spotter / aiterm-mcp /
  codex-sidecar / gpt-connector / codex-cli / lattice）。本waveより前からの状態で、
  `verify-install`も同じ不在をFAILで挙げる。**wire v5がこれを可視化しただけであり、
  解消は別waveの作業。**
- **publish祖先gate未導入は残4製品**（Caveat / Throughline / Spotter / codex-sidecar / aiterm-mcp）。
  既存裁定どおり、次にそのrepoでrelease作業を行うwaveで同時導入する。
