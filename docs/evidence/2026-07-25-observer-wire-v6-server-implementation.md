# Observer wire v6 server-first implementation

- Date: 2026-07-25
- Source repo: `/Users/kite/Developer/ServerManager`
- Safety-net commit: `a045743`
- Implementation commit: `e0674e2`
- Deployment state: not deployed; `FACTORY_V6_INGEST_ENABLED` defaults to `false`

## 実装

- 固定14製品の `factory-report-v6` schema と validator を追加した。
- `/api/factory/v6/reports` を独立feature flag配下に追加した。
- v6をv2/v4/v5と同じhistory/currentへ保存し、期待値だけactual wire version
  `v6`として評価する。
- ObserverはmacOSで`required`、server / WSL / Windows nativeで
  `unsupported`とした。
- Observerの`safe_context` allowlistは空とし、機微情報を受理しない。
- v5 endpointと固定13製品契約は変更せず、rollback面として維持した。

## 同時に修理した工場欠陥

1. 固定product setのfull snapshot後も退役済みCodegraphが
   `factory_v2_current`へ残る欠陥を修理した。v5/v6の同時点以前の行だけを
   整合し、遅着したv5が新しいv6のObserver currentを消さない。
2. BugHubの修理先repo mapからLatticeとAIShellが欠落し、Observerも未登録だった
   欠陥を修理した。各issueは正規repoへ案内される。
3. `.env.example`にv5 feature flagが欠落していた文書欠陥を修理し、v6 flagも
   同じ面へ追加した。

## 検証

- `npm --prefix bughub test`: exit 0
  - AIShell request: `req_f71a57392478460eb1a065432edae0b7`
  - stdout artifact: `art_27e923eb92364b3cb622bebda6cc97f4`
  - stderr: empty
- `git diff --check -- bughub`: exit 0
- コミット後の未コミット差分は、作業前から存在したユーザー所有の
  `.claude/settings.local.json`だけ。変更・stage・commitしていない。
