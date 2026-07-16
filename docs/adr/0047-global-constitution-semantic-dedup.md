# ADR 0047 — グローバル憲法の共通／host境界を意味単位で再裁定する

- 日付: 2026-07-16
- 状態: accepted

## 文脈

ADR 0046で生成体制（`shared/constitution.md`＋host delta→生成物）は成立したが、条文の分類は旧二重正本の名残を引きずっていた。project側優先・配置ゲート・役割→model×effort参照・相談レーンが両deltaへ重複し、外部workerの安全契約・timeout回収・利用可能性4段階はCodex deltaだけ、委譲契約の内容物・実モデル格下げの検知不能・共通lifecycle正典はClaude deltaだけにあった。「確信が持てない指摘は棄却」はCodex deltaと共通正本の二重記述だった。

## 決定

- hostに依存しない判断原則・安全契約・委譲契約・回収契約は`shared/constitution.md`が一度だけ保持する。新設「委譲と外部レーンの共通契約」へ、委譲3レーン教義（native＝host内蔵subagent／external execution／consultation。nativeの同時枠を工場上限にしない）、役割ベース配置と「各hostのrole定義をそのまま使う」原則（正は`docs/02_models.md`）、配置宣言のタイミング、委譲契約の内容物、外部workerの安全契約、timeout回収、利用可能性4段階（external writerはexecution-verifiedのみ）、相談レーン（`gpt_connector`正規入口・Oracleはv1互換・手動rollback限定）、実モデル格下げの検知不能を統合する。工場全体の裁定を、それが最初に決まったhostの側にだけ書かない。
- project側優先と正本／生成物の関係は共通正本の前文が一度だけ述べ、各deltaの定型2行を廃止する。
- shell入口はオーナー裁定 2026-07-16 により**aiterm永続PTY既定を全host共通条文へ一般化する**（従来のCodex=exec既定の裁定を置き換える）。軽量単発読み取りの例外（host標準の単発shellツール可）と「PTY既定は承認・sandboxの迂回ではない」の注意も共通条文が持ち、deltaにshell条文を置かない。
- **両deltaは空（見出しのみ）とする**（オーナー裁定 2026-07-16）。実装配置の対等化（Codex外部枠と`sonnet`実装role。同日以前の「Codex優先配置」裁定を置き換える）は`docs/02_models.md`の決定表が、`spawn_agent`の黙示誤配線の罠は同表「入口の既知の事実」と`docs/05_codex-fragments.md`が正典であり、憲法へ複製しない。generatorは空deltaの固有差分節を出力せず、fixtureが空維持を検査する。host固有条文が本当に生まれた時だけdeltaへ追記する。
- host内で自明な内容（自ツール一覧で見える入口名、config既定の状態説明、正典の手順複製、事件ナレーション）は憲法に書かない。設定・機械ゲートで決まることを文章でAIに言い聞かせない。
- **Elastic統括正典と競合する条文は憲法から削除する**（オーナー裁定 2026-07-16）: 「委譲と外部レーンの共通契約」全節（委譲3レーン・役割配置・委譲契約・worker安全・timeout回収・4段階・相談レーン・格下げ検知不能）、「監査頻度」「コア欠陥のPhase束ね」「大規模変更の進め方」は`shared/orchestrate/contract.md`・`delegation-contract.md`・orchestrate SKILL・`docs/02_models.md`が正典であり、憲法は作業レーンの振り分けと「orchestrateを読む」のみ持つ。正典側に逐語が無かったuntrusted input条項はdelegation-contract.mdへ移設して保全した。
- fixture（`tests/constitution/generation.test.mjs`）が共通契約の所在（共通正本にのみ存在）とhost固有契約の非交差（deltaが共通契約を重複保持しない・共通正本がhost固有語彙を含まない）を検査する。

## 受入証拠

- focused: `make test-constitution` 5/5成功（fail 0・skip 0、空delta省略テストを含む）。`render-global-constitution --write`冪等・`--check` green。
- related: `make lint-constitution`、`make lint-js`、`make test-install`（隔離HOME）成功。`make lint-md`は変更ファイル0エラー。
- size: `claude/CLAUDE.md` 13,772 bytes、`codex/AGENTS.md` 13,771 bytes（共通部のみ・Sources行以外一致。Codex既定32 KiB注入上限内）。
- full: `make ci`は依頼外・既存の`docs/adr/0043-o3-claude-provider-adapter-boundary.md:60` MD012 1件で`lint-md`停止（lint-sh／lint-py／lint-jsはgreen、停止後のfull suiteは未実行）。既存ADRは別セッション所有のため未変更、別タスクへ切り出し済み。

## 影響と戻し方

共通契約の更新箇所が一つになり、Codex側にしかなかった安全・回収・段階契約がClaude親にも同一文で適用される。既起動セッションは新生成物を再読込しないため、適用は新規セッションから。戻す場合は正本・delta・fixture・生成物・本ADRを同じ単位でrevertし、片寄り分類へ戻る影響を明示する。
