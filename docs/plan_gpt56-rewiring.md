# プラン: GPT-5.6 世代対応オーケストレーション再配線

**2026-07-16 supersession**: 本書に残る旧着手ゲート・既定委譲は実装当時の履歴であり、現在はグローバルCLAUDE.md／AGENTS.md「作業レーンと統制」の二レーン裁定を優先する。

> 実行順と全体状態の親正本は[開発工場 統合マスター計画](plan_factory-master.md)。残る他端末routing確認はCodex全対応Wave 3と同じhost receiptで閉じ、本書単独で端末rolloutを反復しない。

<!-- 前提: Fable級統括が設計・Opus/Sol級の親が日常実行（2026-07 時点）。モデル×エフォートの正は docs/02_models.md -->

正本（このファイルが TODO を兼ねる）。設計経緯の完全版はセッションプラン（2026-07-10〜11、Plan 2視点→統括裁定→refuter 反証→オーナー裁定3件）に基づく。

## Context（なぜやるか）

GPT-5.6 世代（Sol/Terra/Luna）と Grok 4.5 / Composer 2.5 の登場で、モデル配置の正典が旧世代（gpt-5.5・grok-build）のまま腐った。さらに:

1. **最上位張り付き**: `~/.codex/config.toml` が Sol×ultra にピンされ、ultra＝「max 推論＋proactive 自動委譲」なので最上位モデルが最上位の子を自動量産していた。Claude 側も ultracode の子が親モデルを既定継承する同型問題。
2. **Codex 親が憲法に従わない**: `~/.codex/AGENTS.md` は Claude 中心憲法への直接 symlink で、Claude固有配線の混在など Codex に有害な指示が含まれていた。解消時に専用憲法を約2KBへ過剰圧縮し、人格・応対・調査・計画・権限・変更作法まで落とした二次事故も発生した（注: 2026-07-16裁定でshell入口はaiterm PTY既定が全host共通化された。当時の問題は配線の混在であってPTY自体ではない）。
3. **判断基準の不在**: モデル×エフォートの決定表がなく、親の賢さ頼み。日常の親は Claude=Opus 4.8 / Codex=Sol（設計者 Fable より弱い）なので、判断は表とゲートに焼き込む必要がある。

## 設計の背骨（5行）

1. **プロンプトより構造で縛る**: config ピン解除でなく、sidecar defaults・役割別サブエージェント TOML・呼び出し時明示引数という構造で子の配置を固定。
2. **判断はティアで買い、粘りは effort で買う**: 「中位×xhigh」より「旗艦×low」。標語: **配置に迷ったら安い方・採用に迷ったら棄却**。
3. **親は選ばず、引く**: 弱い親でも決定表を「写すだけ」で正しい配置。上振れ（上位ティア・xhigh 以上・ultra・物量への主モデル継承）は要正当化。
4. **親のモデル×エフォートはオーナーの領分**（2026-07-10 裁定）: 規範・AI はピンを打ち替えない。事実と推奨値の提示まで。規範が縛るのは子の配置だけ。
5. **消費枠は4つ**（2026-07-10/11 裁定、現行入口へ更新）: Anthropic／OpenAI-Codex／OpenAI-ChatGPT（gpt-connector）／xAI。実読不要の純推論は `gpt_connector` の `consult` を第一選択とし、caller既知slugで model+effort を明示する。物量は Terra/Composer、並列 finder は grok-4.5。専用Chromeとproduct-owned stateを使い、timeout後はsessionsで追跡する。Oracle・APIへの暗黙fallbackは禁止し、Oracleはv1互換または手動rollback時だけ明示する。

## 調査で確定した事実（要点。詳細は rag/models/ の2記事）

- **GPT-5.6**（2026-07-09 GA）: `gpt-5.6-sol`（旗艦 $5/$30）/`gpt-5.6-terra`（中位 $2.5/$15）/`gpt-5.6-luna`（軽量 $1/$6）。effort=low/medium/high/xhigh/max/ultra、**Sol の既定は low**（公式「低く始めて上げろ」「max を無条件推奨するな」）。**ultra＝max 推論＋proactive 自動委譲 ON**（使用量急増の公式警告）。ネイティブサブエージェント: `~/.codex/agents/<name>.toml`（`name`/`description`/`developer_instructions` **3必須**・欠落や綴りミスは起動 warning のみで無言無効化）。
- **xAI**（2026-07-08 GA）: `grok-4.5`（$2/$6・500k・effort low/medium/high のみ・実務判断は首位級だが難関SWE/形式推論は弱い・ハルシ増）／`grok-composer-2.5-fast`（effort 非対応・物量特化・判断力低）。
- **refuter 反証で判明（max_threadsのみ2026-07-13訂正）**: codex-sidecar は端末 config の model/effort 行を**正確に継承する**（＝Sol×ultra ピンが sidecar 委譲へ波及していた）。`.codex-sidecar.yml` が無いと sidecar 自体が CONFIG_NOT_FOUND。`[agents]` に委譲モードのキーは無い（effort から自動導出）。当時の `agents.max_threads` 起動エラー説は再現未実施で、現行公式仕様が公開設定として明記したため撤回。`/model` ピッカーは config.toml へ**再ピン永続化**する。aiterm の grok/composer は隔離設計（OAuth のみ共有）で継承問題なし。

## 決定表

役割→〔ティア×effort×入口〕の決定表は [docs/02_models.md](02_models.md) のみを参照する（本planへ要旨を複製しない。過去の要旨は複製が腐る実証となったため削除済み——supersessionの経緯はgit履歴とADR 0048参照）。

## 実装チェックリスト

- Latticeへ移管済み: gw-0039 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L10
- Latticeへ移管済み: gw-0040 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L11
- Latticeへ移管済み: gw-0041 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L12
- Latticeへ移管済み: gw-0042 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L13
- Latticeへ移管済み: gw-0043 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L14
- Latticeへ移管済み: gw-0044 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L15
- Latticeへ移管済み: gw-0045 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L16
- Latticeへ移管済み: gw-0046 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L17
- Latticeへ移管済み: gw-0047 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L18
- Latticeへ移管済み: gw-0048 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L19
- Latticeへ移管済み: gw-0049 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L20
- Latticeへ移管済み: gw-0050 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L21
- Latticeへ移管済み: gw-0051 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L22
- Latticeへ移管済み: gw-0052 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L23
- Latticeへ移管済み: gw-0053 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L24
- Latticeへ移管済み: gw-0054 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L25
- Latticeへ移管済み: gw-0055 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L26
- Latticeへ移管済み: gw-0056 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L27
- Latticeへ移管済み: gw-0057 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L28
- Latticeへ移管済み: gw-0058 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L29
- Latticeへ移管済み: gw-0059 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L30
  `agent_type` が隠れ、`task_name` を role 名と誤認した結果、3子すべてが親の
  Sol×xhigh を継承した問題を解消する
  - Latticeへ移管済み: gw-0062 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L31
  - Latticeへ移管済み: gw-0063 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L32
  - Latticeへ移管済み: gw-0064 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L33
    `verify-codex-agent-routing` を追加する
  - Latticeへ移管済み: gw-0066 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L34
    不一致なら本タスクを渡さない
  - Latticeへ移管済み: gw-0068 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L35
    implementer/refuter/sorter の E2E smoke を green にする
- Latticeへ移管済み: gw-0070 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L36
  role TOMLのinstructionsが子へCRLFで注入された場合も、改行差だけで`missing`にしない。
  実際の欠落は引き続き拒否する回帰テストを追加。WSLへ継承されたWindows `TEMP`でControl Record
  testが別pathを読む問題もtest target内のPOSIX一時directory固定で除去した。173件＋routing test green、
  LiveTRの実rolloutも`developer_instructions: applied`へ復旧
- Latticeへ移管済み: gw-0075 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L37
  親 permission profile で上書きする 0.144.1 の仕様／文書不一致を解消する
- Latticeへ移管済み: gw-0077 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L38
  - Latticeへ移管済み: gw-0078 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L39
  - Latticeへ移管済み: gw-0079 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L40
  - Latticeへ移管済み: gw-0080 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L41
  - Latticeへ移管済み: gw-0081 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L42
- Latticeへ移管済み: gw-0082 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L43

## H（オーナー領分）

- `~/.codex/config.toml` の親既定（現在 Sol×ultra）: AI は変更しない。05 の事実提示を見てオーナーが判断。再ピン仕様（/model 選択が永続化）に注意。
- Claude 親のモデル（現在 fable[1m]）: 同上。

## aiterm への改修依頼（aiterm プロジェクト側で対応・2026-07-11 裁定）

**→ 全4件消化済み（2026-07-11・aiterm-mcp コミット 38a33f3・回帰183件 green・実起動検証済み。詳細は aiterm-mcp docs/10）**。実装結果: 3ツールに `model` 引数（grok 既定は `grok-4.5` へ）、codex managed config は引数の model/effort でピン上書き＋起動応答に実効値と出所（引数/端末config継承/CLI既定）を常時明示（effort=ultra は警告付き）、grok/composer への `reasoning_effort` 指定は起動前に明示エラー（headless 専用の旨を返す）。**v0.11.0 として npm 公開済み（2026-07-11・GitHub Release/MCP Registry 再登録込み）**。各端末は `npm i -g aiterm-mcp` で反映（この Mac は反映済み。他端末は「他端末波及チェックリスト」に準ずる）。

1. `codex_agent` に `model` 引数を追加（現状渡す手段なし）
2. codex の端末 config 丸ごとコピーによるピン継承の明示化（model/effort を引数で上書き可能に）
3. `grok_agent` のハードコード `--model grok-build` を現行 `grok-4.5` へ（ライブカタログに不在の stale 名）
4. `reasoning_effort` enum の実態合わせ（grok=low/medium/high のみ・composer=非対応・対話 TUI では `--effort` 無視）

## 他端末波及チェックリスト（端末ごと）

- Latticeへ移管済み: gw-0100 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L6
- Latticeへ移管済み: gw-0101 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L7
- Latticeへ移管済み: gw-0102 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L8
- Latticeへ移管済み: gw-0103 → docs/archive/lattice-source-ledger/gpt56-rewiring-cutover-20260719.md#L9
  - FOX WSL2 は 2026-07-17 の Windows ダイアログ無限増殖（caveat
    `codex/wsl2-codex-app-server-shell-script-hooks-windows`）により Codex 実測を保留。
    interop 安全化（plan_callout-hooks.md Phase 5 の新 TODO）後に実施する。

## 検証（end-to-end）

`make lint` green／`./install.sh` の linked 出力／`./bin/verify-install.sh` OK／Codex 起動ログに「Ignoring malformed agent role definition」無し／新規セッションの `spawn_agent` に `agent_type` が存在／3 role を `fork_turns="none"` で handshake-only spawn／`verify-codex-agent-routing` が全件 green／sidecar `codex_explore` の model 明示と defaults フォールバック両確認。

## リスク（要点）

他端末の実ファイル SKIP（→verify が名指し）／override 無言シャドー（→非空検出）／toml 必須キー欠落の無言無効化（→3必須焼き込み＋実 spawn 検証）／再ピン永続化（→子は継承非依存の構造で遮断）／`agents.max_threads` とホスト側concurrency slotsの混同（→公式既定6/1を記録し、新規sessionで実効値を検証）／toml・sidecar defaults の具体名が世代交代で腐る（→前提行＋02 手順 step2′＋原則6 grep）。
