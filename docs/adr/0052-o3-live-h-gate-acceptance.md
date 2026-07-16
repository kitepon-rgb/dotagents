# ADR 0052: O3 live H gate受入（実model dispatch smoke）

- Status: Accepted
- Date: 2026-07-17
- Parent canon: `docs/plan_factory-master.md`
- Control: `observer-factory-20260715` Task `o3-live-h-gate-smoke`（classification H）
- H承認: オーナーが本セッションのchatで明示承認（2026-07-17）。目的・影響・rollbackは承認前に
  申告済み（目的=O3完了条件の充足、影響=実model呼び出し数回分のquota消費、rollback=コード変更なし・
  記録はADRとplanのみ）。approval operation_digest:
  `d04923460adff20a052fd7b3eea9b69205abd3fa5bb9d264d1601ad0472ec220`

## 実施したsmoke（全green）

1. **claude-native consult live（`--tools ""`＋`-p`実測、ADR 0045が残置した実測項目）**:
   consult-v1 argv契約そのまま（`--print --verbose --output-format stream-json --input-format text
   --session-id <caller UUID> --model haiku --effort low --permission-mode dontAsk --tools ""
   --disable-slash-commands --no-chrome`）で実行。`type:result`（subtype=success・is_error=false）を
   受領、session ID echo一致、exit 0。**全tool無効の`-p`はlive成立**。
   session `6f601938-1993-4ceb-8a20-42697dbc8f13`。
2. **同一session resume**: `--resume <同一UUID>`で文脈継承を確認（前turnの答え2→「3です。」）。
   同一session ID echo・exit 0。**同一handle resume契約はlive成立**。
3. **claude-native worker live（最小toolset）**: 隔離workspace（scratchpad内使い捨てgit repo）で
   `--tools "Read" --allowedTools "Read"`のworker argvを実行。Read tool実使用で対象file内容を
   正しく報告、workspace無変更（status clean）、`type:result`受領。
4. **codex_opinion live**: `gpt-5.6-terra`×low・readonly。`status:"ok"／workflow:"opinion"`を受領し、
   write痕跡（changedFiles/worktreePath/worktreePreserved）なし。**live応答を
   `projectCodexSidecarOpinionObservation`→`buildConsultationControlObservation`へ通し、
   completed／handle null／source codex-sidecarの完全往復を確認**（`a77b889`のfail-closedガードとも整合）。

証拠log: scratchpad `smoke-consult-start.jsonl`／`smoke-consult-resume.jsonl`／`smoke-worker.jsonl`
（セッション一時領域。要点は本ADRへ転記済み）。opinion raw event log:
`.codex-sidecar/logs/app-server/2026-07-16T181802136Z-opinion-*.jsonl`（非コミット領域）。

## 裁定

- **Phase O3のGate「親hostにかかわらず同じControlとlane固有契約で両社レーンを使える」を充足**と
  裁定する。schema（v26）・adapter projection・placement policy・Phase監査（ADR 0051）に加え、
  live dispatchの成立を確認した。
- **`claude-native`のexecution-verified昇格はまだ主張しない**: 本smokeはverificationの実測証拠だが、
  正式な昇格はRegistry observation記録と検証ladder（installed→registered→verified→execution-verified）
  に従う別手続き。external writerへの使用禁止（`docs/02_models.md`）は昇格まで不変。
- Consultationのdogfood記録（実Controlへのconsultation record運用開始と
  `observer-factory-20260715`のv25→v26 migration）は、多provider consultationを実際に使う
  最初の実需時点で行う（ADR 0045 §5どおり）。

## 未実施

- push・publish・deploy・credential操作・意図的障害試験（本gateの範囲外）。
- xAI（Grok/Composer）laneのconsultation化（ADR 0050非目標のまま）。
