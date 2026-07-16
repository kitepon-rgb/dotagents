# Workflow スクリプト雛形

実証済みの2型。コピーして DIMENSIONS/CTX/検証観点をタスクに合わせて書き換える。`agent()` の `model`・`effort` は docs/02_models.md の決定表どおり明示する（検証・反証系だけ省略＝主モデル継承可）。省略で親任せにしない——親が最上位のとき全子が張り付く。

## 型1: 敵対的監査（Find→Dedup→Verify→Critic）

発見の網羅は並列多視点で、信頼性は「指摘ごとの反証」で作る（この重い型自体、統括レーンの契約クリティカル範囲だけに使う＝contract.md「監査の頻度」）。**2レンズ（実在性/価値）は契約クリティカルな指摘だけ**。Critic の盲点は第2ラウンドへ。

```js
export const meta = {
  name: 'adversarial-audit',
  description: '<対象>の多視点監査＋敵対的検証',
  phases: [{ title: 'Find' }, { title: 'Dedup' }, { title: 'Verify' }, { title: 'Critic' }],
}
const CTX = `<リポジトリ・規約・「誤検知を避けるための前提」（意図的な設計を指摘させない）・
読み取り専用の明言・「evidence に file:line 必須・推測禁止・確度の高いものだけ最大N件」>`
const FINDINGS = { type:'object', required:['findings'], properties:{ findings:{ type:'array', maxItems:10,
  items:{ type:'object', required:['title','kind','files','evidence','impact','effort','suggestion','contract_critical'],
    properties:{ title:{type:'string'}, kind:{type:'string'}, files:{type:'array',items:{type:'string'}},
      evidence:{type:'string'}, impact:{type:'string',enum:['high','medium','low']},
      effort:{type:'string',enum:['S','M','L']}, suggestion:{type:'string'},
      contract_critical:{type:'boolean'} } } } } }  // 契約クリティカル＝認可・tx・公開契約・依存方向・本番操作級
const VERDICT = { type:'object', required:['real','worth_it','reason'], properties:{
  real:{type:'boolean'}, worth_it:{type:'boolean'}, risk:{type:'string'}, reason:{type:'string'},
  revised_suggestion:{type:'string'} } }

phase('Find')
const found = (await parallel(DIMENSIONS.map(d => () =>
  agent(CTX + '\n\n【担当】' + d.prompt, { label:'find:'+d.key, phase:'Find', schema:FINDINGS, agentType:'Explore' })
    .then(r => r && { key:d.key, findings:r.findings })))).filter(Boolean)
const all = []; for (const r of found) for (const x of r.findings) all.push({ id:'f'+(all.length+1), source:r.key, ...x })

phase('Dedup')  // 統合のみ・全 id が merged_ids に現れることをコードで検算し欠落は復元
// …dedup agent → uniq（欠落復元コードを忘れない）…

phase('Verify') // 疑わしきは false。existence レンズ＝実読で evidence 検証／value レンズ＝直す価値・挙動リスク
const verified = await parallel(uniq.map((f,i) => () => {
  const lenses = f.contract_critical ? ['existence','value'] : ['existence']  // 契約クリティカル判定はCTX側で定義
  return parallel(lenses.map(lens => () =>
    agent(`${CTX}\nあなたは懐疑的な検証者。反証を試みよ。観点:${lens}。疑わしい場合は false。\n指摘:${JSON.stringify(f)}`,
      { label:`verify:${i}:${lens}`, phase:'Verify', schema:VERDICT, agentType:'Explore' })
  )).then(vs => ({ ...f, verdicts: vs.filter(Boolean),
    confirmed: vs.filter(Boolean).length > 0 && vs.filter(Boolean).every(v => v.real && v.worth_it) }))
}))

phase('Critic') // 「この監査に漏れている観点・どの指摘にも登場しない重要領域」を実ファイル確認つきで最大5件
// → 盲点が出たら同型の第2ラウンドを回す
return { confirmed: verified.filter(f=>f.confirmed), rejected: verified.filter(f=>!f.confirmed) /*棄却理由も残す*/ }
```

**運用の要**: 棄却理由は捨てない（「実在するが価値なし」の理由が設計判断の宝庫）。確定・棄却・盲点をダイジェスト（file:line 証拠つき）に落とし、以後の全委譲の共通入力にする。

## 型2: 一括整理/移行（項目×厳格契約の並列）

多数の独立対象（プロジェクト・ファイル群・モジュール）に同じ厳格契約を適用する型。**許可操作をホワイトリストで列挙**し、迷いは flags で報告させる（削除0が正しい結果になることも多い）。

```js
export const meta = { name:'bulk-curation', description:'<対象群>へ厳格契約で一括適用', phases:[{title:'Apply'}] }
const REPORT = { type:'object', required:['target','fixed','flags_for_owner'], properties:{
  target:{type:'string'}, fixed:{type:'array',items:{type:'string'}},
  flags_for_owner:{type:'array',items:{type:'object',required:['file','why'],
    properties:{file:{type:'string'},why:{type:'string'},quote:{type:'string'}}}} } }
phase('Apply')
const results = await parallel(TARGETS.map(t => () =>
  agent(`対象: ${t}（この外は書き込み禁止）。バックアップ取得済み。
## 許可された操作（これだけ）
<ホワイトリスト。番号付きで具体的に>
## 禁止
<実質的書き換え・確信のない削除・創作>。迷ったら flags_for_owner へ。
## 手順
全部読む→許可操作を適用→構造化レポート`,
    { label:`apply:${t}`, phase:'Apply', schema:REPORT, model:'sonnet' })))
return results.filter(Boolean)
```

**前提**: 対象が git 管理外なら**先に tar バックアップ**（グローバル鉄則）。

## 分割/無損失系の追加規約

内容の分割・移設を委譲するときは「**無損失の自己監査**」を義務化する:
元の全非自明行が分割後ファイル群に完全一致で1回ずつ出現することを機械照合（Python等）で確認し、結果を報告させる（実績: 自己監査が欠落2行を検出→復元）。
