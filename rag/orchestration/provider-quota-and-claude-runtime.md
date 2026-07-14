# Claude runtime／両provider quota観測の実測契約

**取得日:** 2026-07-15  
**確度:** 公式仕様=高、現Mac実測=高、未ログインClaudeの実行挙動=未検証  
**対象:** Observer同provider伴走、異provider相談、一般Workerのrate-aware配置

## 結論

1. Claude親のcompleted turnは`TaskCompleted`ではなく`Stop`を正規証拠にできる。`Stop`は`session_id`、`cwd`、`last_assistant_message`、`background_tasks`、`session_crons`を持ち、API失敗は`StopFailure`へ分離される。進行中projectionやmtimeを完了扱いする必要はない。
2. Claude ObserverはClaude Codeのbackground sessionを正規hostにできる。`claude --agent observer --bg --name <id> <prompt>`で起動し、返されたjob IDをhandleとして`claude agents --json --cwd`、`logs`、`stop`、`respawn`で観測・停止・継続できる。同じagent viewで見えるため、オーナーの「親と同じアプリで監視する」UXに合う。
3. Claude background sessionはwrite時にworktreeへ移動し、条件次第でcommit／push／draft PRまで自動実行する。Observerはread-only tool集合に固定する。一般writerの正規入口はbackground sessionへ直結せず、統括が所有する隔離worktree上のheadless `claude -p --output-format stream-json`を第一候補にし、session IDと`--resume`を相関する。
4. Claude subscription quotaは公式に`five_hour`／`seven_day`の`used_percentage`と`resets_at`を公開する。Claude Agent SDKはさらに`five_hour`、`seven_day`、model別7日枠、overageを`RateLimitEvent`として持つ。推測や画面OCRは不要である。
5. Codexは公式TUIの`/status`と`/usage`でrate limitを表示する。現行CLIのproduct-owned session eventにも`used_percent`、`window_minutes`、`resets_at`があることをこのMacで実測した。公開manualはこの保存schemaを互換契約としては明記していないため、adapterはversion characterizationとstale判定を必須にする。
6. 現MacではClaude Code 2.1.207はinstalledだが`claude auth status`が`loggedIn=false`、Agent viewのObserver対象sessionも0件だった。したがってClaude laneは現時点でinstalled止まりで、registered／verified／execution-verifiedではない。実account smokeはlogin後に行う。

## 公式契約

### Claude completed-turn feed

- [[raw/claude-hooks]]: `Stop`はmain agentが応答を終えた時だけ発火し、user interruptでは発火しない。API errorは`StopFailure`へ分離される。
- `last_assistant_message`が完了応答を直接持つ。公式もStop時点ではtranscriptへ最終messageが未反映のversionがあるため、このfieldをtranscript再読より優先するよう指定している。
- `stop_hook_active`を見て再入を避ける。`background_tasks`が空でない時は「turn完了」と「session全体の作業完了」を分ける。
- `TaskCompleted`はClaude内部Taskのcloseであり、親turnの完了証拠ではない。`SessionEnd`はcleanup用で、turn feedには遅すぎる。

### Claude execution／continuation

- [[raw/claude-agent-view]]: `--bg`は短いjob IDを返す。`agents --json`は`working | blocked | done | failed | stopped`を返し、`logs`／`stop`／`respawn`で同じsessionを管理する。supervisor restartやsleep後もstateを保持する。
- [[raw/claude-headless]]: `claude -p`は`json`／`stream-json`出力、session metadata、retry event、structured outputを持つ。CLIの`--session-id`、`--resume`、`--continue`と合わせ、timeout後に同一sessionを回収できる。
- Consultationは`--bare --tools ""`相当のworkspace toolなし、Workerは明示tool集合と隔離workspace、Observerはread-only tool集合とする。三者を同一adapter成功へ丸めない。

### Claude quota

- [[raw/claude-statusline]]: subscriberの最初のAPI response後、status line入力に`rate_limits.five_hour|seven_day.used_percentage`と`resets_at`が現れる。各windowは独立に欠落しうる。
- [[raw/claude-agent-sdk-python]]: `RateLimitEvent.rate_limit_info`は`status`、`resets_at`、`rate_limit_type`、`utilization`を持つ。typeは`five_hour | seven_day | seven_day_opus | seven_day_sonnet | overage`。
- v1 adapterは実行streamの`RateLimitEvent`を第一入口とし、直近snapshotをproduct-owned adapter stateへ保存する。status lineは既存Claude sessionへ設定変更を要するので、H承認後の補助入口に留める。

### Codex execution／quota

- [[raw/codex-manual]]: `codex exec --json`は`thread.started`、turn lifecycle、最終message等をJSONLで返し、`codex exec resume <SESSION_ID>`で非対話sessionを再開できる。Claude親→Codex相談はread-only Codex Sidecarまたは同等のCodex consultation adapterへ投影できる。
- 同manualは`/status`をrate limits表示、`/usage`をdaily／weekly／cumulative usageとresetの対話入口として記載する。
- 2026-07-15、Codex CLI 0.144.3の最新product-owned `token_count` eventから次を秘密非表示で実測した。

```json
{
  "limit_id": "codex",
  "primary": {
    "used_percent": 2.0,
    "window_minutes": 10080,
    "resets_at": 1784666224
  },
  "secondary": null
}
```

`resets_at`は`2026-07-21T20:37:04Z`。これは一時snapshotであり、quotaの恒久値ではない。adapterはevent timestamp、CLI version、window IDを束縛し、古いsessionの値を現在値へ転用しない。

## adapter裁定

| lane | 正規入口候補 | handle／回収 | 現在地 |
|---|---|---|---|
| Claude親→Claude Observer | Claude background session＋`--agent observer` | job ID、`agents --json`、`logs`、`stop`、`respawn` | installed、未login |
| Codex親→Claude Worker | headless `claude -p --output-format stream-json`＋統括隔離worktree | session ID、process receipt、`--resume` | installed、未login、adapter未登録 |
| Codex親→Claude Consultation | headless Claude、workspace toolsなし | session ID、`--resume` | installed、未login、adapter未登録 |
| Claude親→Codex Consultation | Codex Sidecar read-onlyまたは`codex exec --json --sandbox read-only` | sidecar handleまたはthread ID、同一ID resume | Codex側入口はexecution-verified、Claude親からは未実測 |
| Claude quota | Agent SDK `RateLimitEvent`、補助=status line snapshot | quota pool＋window digest | schema verified、実account未実測 |
| Codex quota | product-owned `token_count.rate_limits` snapshot | quota pool＋window digest | current hostで実測済み |

現行aiterm MCPのcallable toolはCodex／Grok／Composerだけで、Claude Agent toolはない。現行ElasticがCodexへ寄るのはselectorの好みだけでなく、Codex親からClaudeへdispatchする登録済みexecution adapter自体が欠けているためである。

## 残る実測gate

- Claude loginはcredential操作なのでH。login後、最小一回のClaude responseで`RateLimitEvent`またはstatus line quotaを取得し、秘密を出さずに5h／7d windowをfixture化する。
- Claude background Observerをread-onlyで一回起動し、job ID、`agents --json` state、Stop hook、stop／respawnをcharacterizationする。
- headless Claudeを固定session IDで実行し、normal completion、rate limit、timeout、resume、malformed reportを確認する。
- Codex quota eventはCLI updateでschema driftしうる。0.144.3 fixtureを固定し、unknown／欠落／secondary nullをfail loudにする。
- 両provider snapshotがverified以上になるまで、rate-aware自動配置は開始しない。
