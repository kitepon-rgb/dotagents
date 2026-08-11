# fm-0698 関連gate実測

実施日: 2026-08-11

対象: 工場全製品の展開閉包修理（commit `e738538`）

## 結果

- `make test-update`: pass（agents-update cron environment）
- `make test-install`: pass（clean-home install。意図的なnegative fixtureの検出を含む）
- `make test-factory-reporter`: 74 / 74 pass
- `make test-factory-scan`: 84 / 84 pass
- `make test-factory-wire`: 27 / 27 pass
- `git diff --check`: pass
- `./bin/verify-install.sh --profile official`: pass

Mac実機では新設した3つの配布入口が未導入だったため、正規入口の`./install.sh`を1回実行した。その後の`verify-install`で、全入口がdotagentsの正規ファイルを指すことを確認した。

## 境界

Windows本番Task Schedulerへの登録・実行はこのgateに含めていない。これは高リスクapplyとして、目的・影響・戻し方を示した直前承認後にのみ実施する。

BPR5をLatticeへ戻す変更は行っていない。
