# P4 昇格キュー — 端末メモリ→リポ正典への昇格待ち行列

前提: FOX(WSL) の P4 メモリ整理（2026-07-04・bulk-curation 20プロジェクト・flags 35件のオーナー裁定）で確定した「リポに置くべき真実」。**起票元の FOX(WSL) は Mac 主作業リポに触らない（オーナー指示 2026-07-04「Macでの作業対象はこっちで触れんなよ」）**ため、消化は各リポの次の作業セッション（端末問わず）が行う。

消化の作法: ①対象リポで fetch→照合 ②出典メモリ（FOX(WSL) の端末メモリ。下記に要旨あり＝メモリを読めなくても本表だけで書ける）を本表の要旨から正典へ書き起こす ③push ④本表の行を `[x]`＋日付にして dotagents を push。全行消化されたら本ファイルは削除してよい。

## OpenCClaw

- [ ] bellbot の `docker compose build` は npm 依存の増減を image に反映しないことがある——確実に反映するには `docker builder prune` で BuildKit キャッシュを消してから再ビルド → **デプロイ手順書（README/docs）へ**（出典: memory/reference_bellbot_image_npmci_cache_sticky.md）
- [ ] Codex app-server tokenUsage の意味論: `total.totalTokens`=スレッド生涯の累積和（課金用）／`last.inputTokens`=直近ターンの入力＝**文脈オーバーフロー監視はこちら**（本番誤発火バグの実績あり）→ **Phase 10A-15 関連 docs へ**（出典: memory/reference_codex_tokenusage_total_vs_last.md）
- [ ] config-templates/（placeholder 付き template）は host 実 config の正本ではない——deploy 状態は host 上の config.toml を直接読まないと確定できない → **README/docs の運用節へ**（出典: memory/project_config_templates_drift_from_deployed.md）
- 消化済み: aiterm heredoc×mark 罠 → caveat `aiterm/aiterm-pty-send-mark-true-breaks-heredoc-...` に public 登録（2026-07-04）／C# MCP nullable→server silent drop → caveat に**既存 public 登録あり**（重複登録不要）

## ServerManager

- [ ] Freenove FNK0100 実機実測値（**再現困難・最重要**）: ケース基板 MCU = Nuvoton MS51FB9AE（I2C-1 0x21・FW 20250724_V1.1・ファン2ch PWM 自律制御）。書込 reg: 0x04=モード(0停止/1手動/2温度自動)・0x05=PWM周波数・0x06=duty[2]・0x07=温度閾値[低,高]・0xff=flash保存。読出: 0xf7=モード・0xf9/0xfa=duty・0xfb=閾値・0xfc=基板温度。出荷既定=モード2・閾値30/45°C・duty 100/255。温度源は基板センサ（Pi CPU 温度ではない）→ **docs/HARDWARE.md 新設へ**（出典: memory/project_freenove_fnk0100_hardware.md）
- [ ] codex-sidecar root 汚染の恒久対策（サイドカー専用 `~/.codex-sidecar` home 分離・`CODEX_HOME_HOST` オーバーライド）はアーキテクチャ決定 → **runbook/AGENTS.md へ**（出典: memory/project_codex_sidecar_root_auth_contamination.md）
- [ ] SoftBank 10G 網は MSS クランプ実施済み＝**interface MTU 1500 のままが正しい・下げるな**（half-day 浪費した誤診の再発防止）→ **インフラ docs へ**（出典: memory/project_softbank_10g_router_mss_clamp.md）
- [ ] `docker compose restart` は config を再評価しない＝environment/bind mount 変更は反映されない（deploy-poller の罠）→ **デプロイ docs（OpenCClaw 側配置なら OpenCClaw へ）**（出典: memory/project_openclaw_deploy_restart_pitfall.md）
- [ ] labwc は graphical-session.target を発火しない（GNOME/KDE と違い user systemd 自動起動が素通りする）→ **pi5 autostart docs へ**（出典: memory/feedback_pi5_user_systemd_autostart.md）

## rpgdev

- [ ] CLAUDE.md⇄AGENTS.md の手動同期規約（`cp CLAUDE.md AGENTS.md` →ヘッダ1-3行だけ Codex 用に戻す）がリポに未記載 → **CLAUDE.md へ**（出典: memory/agents-md-twin-of-claude-md.md）
- [ ] ハブ版 split-brain の対処手順（他セッション停止→shutdown→WSL/Windows 両側 `npm i -g rpgdev@latest`→再起動）・稼働中 npm i -g の EBUSY 罠・csc.exe exit 1 の無害判定条件（.rpgdev-deployed-version マーカ＋コード grep）→ **docs/windows-wsl.md・docs/releasing.md へ**（出典: memory/hub-version-split-brain.md）

## stock-mcp

- [ ] ms2-bridge の実運用: Windows 側の独立コピー `C:\Users\<user>\ms2-bridge` に手動コピー→再起動で反映。PC 再起動時は ms2-bridge.vbs / ms2-excel.lnk で自動復帰するが**マーケットスピード2 本体は自動起動しない** → **CLAUDE.md/docs へ**（IP・秘密は含まないため public repo でも可）（出典: memory/project_ms2_bridge_deploy_topology.md）

## WebAICoding

- [ ] Cloudflare API トークンの保管場所（`~/.config/cloudflare/cf.env`・chmod 600）・kitepon.dev の zone id・DNS 作成スクリプト（~/Developer/x-article-mcp/deploy/create-cloudflare-dns.js）→ **CLAUDE.md/docs へ**。※トークン値そのものは書かない。リポの公開範囲を確認してから収録内容を決める（出典: memory/reference_cloudflare_token.md）

## terminal（aiterm-mcp）

- [ ] 実機 rtk が 0.43.0 へ更新済み（2026-07-04 実測）。golden fixture（test/fixtures/pytest/*.expected.txt）の byte 一致を 0.43.0 で再検証し、CLAUDE.md（test/ 節2箇所）・CONTRIBUTING.md（pytest reducer 節）の「0.42.0」記載を更新 → **リポ正典の版数更新＋golden 再検証**（出典: memory/aiterm-pytest-byteexact-maintenance.md）

## MMOAuction（リポ側の旧パス残り）

- [ ] CLAUDE.md 71行・214行の `/home/kite/projects/QuoLabo` → `/home/kite/Developer/QuoLabo` へ更新（HANDOVER.md も同種残存が無いか確認）。端末メモリ側は 2026-07-04 に修正済み（出典: bulk-curation MMOAuction 報告）

## グローバル憲法・caveat（消化済み）

- [x] 「コミットの挙動説明は diff を読んでから言う」→ グローバル CLAUDE.md git 作法節へ収録（2026-07-04。出典: stock-mcp memory/feedback_verify_diff_not_commit_title.md）
- [x] Caddy(docker)×UFW×host-bind 罠 → caveat `docker/caddy-docker-reverse-proxy-...` に public 登録（2026-07-04。出典: stock-mcp memory/feedback_caddy_host_bind_ufw.md）
