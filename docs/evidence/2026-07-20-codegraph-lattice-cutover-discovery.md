# Codegraph完全撤去／Lattice cutover discovery

- 観測日: 2026-07-20（Asia/Tokyo）
- Control: `codegraph-lattice-cutover-20260720`
- 対象HEAD: dotagents `4e6717e`、Lattice `7579fc3`

## Lattice実行依存

禁止分類として、PATH上の`codegraph`を起動する正規実行経路を確認した。

- `src/codegraph-adapter.mjs`
- `src/treatment-runner.mjs`
- `src/rc1-v4-campaign.mjs`
- `src/rc1-v5-campaign.mjs`
- `src/rc2-campaign.mjs`
- `src/rc3-dogfood-scaffold.mjs`
- `src/rc3-scripted-campaign.mjs`
- `test/integration/`配下の正規統合test群

root packageの`npm ls @colbymchenry/codegraph --all --json`には依存を認めなかった。ただし同梱
`sensor/package.json`とlockは`@colbymchenry/codegraph`を名乗り、`codegraph` binを宣言していた。
`lattice-mcp`自身は`sensor/dist/index.js`を直接importしており、第三者global packageは不要である。

## host別baseline

| host | Codegraph package | Lattice package | 旧MCP登録 | Lattice MCP登録 |
|---|---:|---:|---|---|
| Mac | 1.4.1 | 0.6.7 | Claude/Codexで有効 | なし |
| main-server | 1.4.1 | 0.6.6 | Claude/Codexで有効 | なし |
| FOX WSL2 | 1.4.1 | 0.6.6 | Claude/Codexで有効 | なし |
| FOX Windows native | 1.4.1 | 0.6.6 | 親MCP登録なし | なし |

Macでは旧`codegraph serve --mcp` process 132件、旧daemon record 75件、Lattice sensor daemon
record 209件を観測した。process停止・record削除・package撤去は本証拠の時点では未実施。

## 残存参照の分類

### 禁止

- PATH上の`codegraph`、`npx @colbymchenry/codegraph`、第三者SDKを起動・importするruntime/test。
- Codegraph MCP登録、global package、daemon、更新対象、required product扱い。
- Lattice不調時に外部Codegraphへ戻る暗黙fallback。

### 許可

- `sensor/LICENSE`、`sensor/NOTICE`、fork元commitとMIT attribution。
- 不変ADR、archive、事件記録、保存済みresearch artifact。

### Decisionで固定する互換識別子

- `codegraph_*` MCP tool名はv1入力互換名として8面だけ維持する。ただしprovider／owner／Lattice系列versionを
  `codegraph_status`とserver instructionsで機械可読に宣言し、独立製品の存続を表さない。
- `.codegraph/` project indexと`CODEGRAPH_*`内部環境変数は吸収forkのstorage／internal ABI識別子として
  当面維持する。外部CLI探索・package解決・MCP登録には使用しない。
