# Factory CI

所有: dotagents所有・工場管理製品向けL2正典。

工場管理製品の最終CIを、共通のself-hosted runner群で実行する契約を定める。実装中の確認は
共通憲法どおりfocused testで行い、full testは関連確認が完了した後の最終確認だけに使う。

## 標準契約

- macOS native・Linux native・Windows native・WSL2を対象とする製品は、4環境で同じfull
  commandを並列実行する。OSごとの役割分散はしない。対応OSを限定する製品は、製品契約に
  従って対象環境だけを選び、非対応環境を成功扱いしない。
- 製品repoは`kitepon/dotagents/.github/workflows/factory-full-ci.yml@main`を呼び、製品自身の
  full commandだけを渡す。独自runner登録・OS matrix・役割分散・capacity・fallbackは作らない。
- 共通workflowは実行環境の論理CPU数を`FACTORY_CI_JOBS`として渡す。製品の標準test runnerが
  自身の並列度を決め、工場側は製品固有の並列flagを強制しない。
- runnerに必要な標準toolchainを常備し、個人用PATHや特殊な端末状態を前提にしない。runnerが
  見えない時やtoolchainが欠けた時に別の実行面へ迂回せず、工場側の失敗として明示する。

## 責任境界

- jobがqueuedのまま、対象labelのrunnerが見えない、runner groupからrepoが見えない、標準
  toolchainがない、共通workflow自体が失敗する問題はdotagentsが直す。
- 製品のfull commandが開始した後の製品コード・fixture・試験の失敗は、その製品repoで最小再現と
  focused testを使って原因を特定し、根治する。
- 製品側は工場の問題を回避するためのrunner、matrix、再試行、別経路を追加しない。dotagents側も
  製品の失敗を共通workflowの条件分岐で隠さない。

## 製品repoからの呼び出し

各製品の`.github/workflows/ci.yml`は、原則として次の薄いcallerだけを持つ。

```yaml
jobs:
  full:
    uses: kitepon/dotagents/.github/workflows/factory-full-ci.yml@main
    with:
      environment: ${{ github.event_name == 'workflow_dispatch' && inputs.environment || 'all' }}
      full-command: PRODUCT_FULL_COMMAND
```

製品または試験の失敗は製品repoで原因を特定する。runnerや共通workflowの問題はdotagentsで直し、
製品へ独自のCI基盤を追加しない。

## runner登録・repo移転

1. 対象repoからrunnerとlabelを確認する。

   ```sh
   gh api repos/OWNER/REPO/actions/runners \
     --jq '.runners[] | {name, status, busy, labels: [.labels[].name]}'
   ```

2. Organizationのrunnerとrunner groupのrepo accessを確認する。

   ```sh
   gh api orgs/OWNER/actions/runners
   gh api orgs/OWNER/actions/runner-groups/GROUP_ID/repositories \
     --jq '.repositories[].full_name'
   ```

3. Organizationにはrunnerが存在し、対象repoからだけ見えない場合はrunner groupへrepoを追加する。
   Organizationにも存在しない、または旧owner／旧repo scopeへ登録されている場合だけ、各hostの
   runnerを対象Organizationへ登録し直す。登録tokenは文書・log・shell履歴へ残さない。
4. `factory`と対象環境のlabel（`macos-native`、`linux-native`、`windows-native`、`wsl2`）を持つ
   runnerがonlineであることを確認する。
5. `workflow_dispatch`で対象環境を一度実行し、同じfull commandが割り当てられたことを確認する。
