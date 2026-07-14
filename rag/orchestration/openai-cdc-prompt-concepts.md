# OpenAI CDC promptから継承するElastic Orchestrator原則

- 出典: [[raw/openai-cdc-multiagent-prompt]]
- 取得・整理日: 2026-07-14
- 確度: 高（一次PDFの全文・全2ページを抽出とrenderで確認）

## 継承する原則

- worker数を固定配分せず、未解決の不確実性と情報利得に応じて動的に発行する。
- 表現でなく機序に基づくapproach familyを明示し、同一系列への過剰投入を抑える。
- 初期探索では有力案や既存Findingの共有を制限し、lineageの独立性を保つ。
- blocked経路は、新しい機序・不変量・構成が出た場合だけ再開する。
- adversarial auditを途中と最終gateの両方に置き、具体的な証拠を要求する。
- rootが統合・反証・再配置・終了判定を保持し、部分成果を完成扱いしない。

## dotagents向けに変更する点

- PDFの`64 concurrent agents`は利用環境固有の上限であり、固定値を正典化しない。
- PDFの`8 hours`は当該数学課題固有の停止条件であり、一般タスクへ移植しない。
- 数学的approach探索だけでなく、write scope、worktree、F/A/H、H承認、provider制約、
  credential、cost、rate limit、resume、Executor固有state ownershipを扱う。
- 独立性やFindingの意味をコードが自動裁定せず、観測可能なlineage事実と手続きgateだけを
  機械化する。
- 完成条件は「多数のagentを動かしたこと」ではなく、対象タスクの受入条件、証拠、反証、
  統合、回帰、knowledge returnが揃ったこととする。
