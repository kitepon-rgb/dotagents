# P5受入証拠 — host別v5切替（H）

- 日付: 2026-07-25
- 対象: active 4 host すべて

## 切替結果

runbook契約どおり**1台ずつ直列**で切替えた。各hostで config backup → endpoint書換 →
scheduler dry-run → apply → scan → enqueue → flush の順。

| host | profile | aishell | contract_version | 初回v5 report |
|---|---|---|---|---|
| mac-kite | mac | **installed** (0.4.1) | 5.0 | `4402e7c7-49db-4235-9e6b-9a4185b3b31c` |
| main-server | server | `not_applicable` | 5.0（servermanagerのみ1.0、後述） | `2b6bb667-5fb5-4e6d-9998-1b059b4e741f` |
| fox-wsl | wsl | `not_applicable` | 5.0 | `05bef071-47fc-4a12-beb2-a846a1c7d7cc` |
| windows-workstation | windows-native | `not_applicable` | 5.0 | `170b6c27-ae8b-4355-a718-ba175ea4048f` |

全hostで `sent: 1 / retained: 0 / dead_lettered: 0 / ack_failed: 0`。

退役済み`codegraph`は各hostで`contract_version=2.0`の`not_applicable`として履歴に残り、
v5 snapshotが上書きしていない。**major越しの履歴連続性が保たれている。**

## 修理したexpectationの実地検証

**wire v4で必須へ昇格したはずのLatticeがoptionalのままだった欠陥**（P1で修理）が、
cutover直後に実効した。

```json
{"host_id":"fox-wsl","product_id":"lattice","severity":"high","state":"new","issue_kind":"expectation"}
```

修理前、`fox-wsl`の`lattice`は`missing`なのにexpectation issueが1件も無かった。
修理後の初回v5 reportで**high issueが新規に立った**。反証が掘り当てた
「必須コア製品の欠落が黙って見逃される」状態が、実際に解消されたことの証明である。

## wv5-0550 — 二重化と巻戻しの確認

```
host+product重複: なし（issue identityがmajorをまたいで共有されている）
```

`host + product + fingerprint`によるissue identity共有が実測で確認できた。
wire majorをまたいでも同一期待違反が二重issueにならない。

open系expectation issueは14件。うち**今回のcutoverで新規に立ったのは`fox-wsl`/`lattice`の1件だけ**で、
これは意図した可視化である。残る13件は以下のとおり本waveと無関係な既存状態。

## 途中で私が壊して直したもの（隠さず記録する）

windows-workstationで`bash ./install.sh`を実行したところ、**同一物理マシンのWSL側で走り、
`fox-wsl`のsymlinkをWindows repo (`/mnt/c/...`) へ張り替えてしまった**。
`fox-wsl`は`FOX`のWSLインスタンスであり、windows-workstationと同じ機体である。

即座に検知し、`fox-wsl`自身のrepoから`install.sh`を再実行して復旧した。

```
復旧後: /home/kite/Developer/dotagents/bin/factory-{scan,reporter}-v5.mjs
```

Windows native側は独自の`C:\Users\kite_\.local\bin`を持つため、そちらへ
PowerShellでsymlinkを作成した。

**教訓**: WSLを持つWindows hostへ`ssh <windows-host> "bash ..."`を投げると、
Windows nativeではなくWSLで実行される。host識別を`hostname`だけで判断しない。

## 本waveと無関係な既存の観測（対処は別途）

- **fox-wslはコア製品の大半が欠落している**。caveat / throughline / spotter /
  aiterm-mcp / codex-sidecar / gpt-connector / codex-cli / markitdownがhigh expectation
  issueで`ongoing`。`verify-install`も同じ8製品の不在をFAILで挙げる。今日より前からの状態。
- **退役済みCodegraphのexpectation issueが4 hostで開いたまま**。`state`は
  `recurred` / `ongoing`、最終更新は**2026-07-20**（Codegraph退役日）。
  v4/v5のproduct setに`codegraph`は無いため、以後どのreportでも評価されず、
  自動では永久に解決しない。
- **main-serverの`servermanager`だけ`contract_version=1.0`**。他製品はwire contract版
  （5.0）を返すが、`serverManagerNative`は製品自身の契約版を返す。
  v4時点のBugHub履歴でも1.0であり、**v5の回帰ではない**。

後二者は本waveで見つけた欠陥として工程表へ登録する。
