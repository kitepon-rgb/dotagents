# Grok 親host 全対応

**状態:** Active
**開始:** 2026-08-16
**工程正本:** 本ファイル（Lattice未適用。オーナーが指示した時だけ移管する）
**親導線:** [開発工場 統合マスター計画](plan_factory-master.md)
**レーン:** 統括（受入が多段、後続波は製品repo、compat切断に証跡が要る）
**終着:** B。Grok BuildをClaude Code / Codexと同格の工場親にする。Claude面への寄生を完成形にしない。

Codex全対応の型を踏襲する。全対応はファイル数の左右対称ではなく**能力対称**である。製品固有機能は無理に移植せず、`対応 / 製品固有 / 非採用（理由）` のいずれかを明記できればその面は閉じる。

## 0. 目的

dotagentsを開いたGrok親が、Claude面を吸わずに工場原則・主要workflow・委譲品質・端末再現性を自前の面から得る。Grok Buildは基盤toolchainのままだが、親hostとしては憲法・配布・工場MCP・工場hook・親別connectorの所有者になる。

2026-08-14の`grok-factory-application`（GF01〜GF07）は到達性と害止めの証拠であり、正式親host化の受入ではない。`partial` / `unsupported` / `not_applicable`をgreenへ丸めない。

## 1. 完了条件

Grok親について次がすべて言える。

1. グローバル憲法は`shared/constitution.md`＋`grok/AGENTS.delta.md`から生成した`grok/AGENTS.md`だけを読む。`~/.claude/CLAUDE.md`（Claude delta付き）をuser ruleとして吸わない。
2. 工場skill / 工場agent / 工場runbookは`~/.grok/`へsymlinkされ、`verify-install`がそれを見る。
3. 工場MCP（caveat / lattice / aiterm / aishell / gpt_connector / codex-sidecar）は`~/.grok/config.toml`が所有する。handshake失敗を成功扱いしない。
4. 工場hookは`~/.grok/hooks`が所有し、Claude `settings.json`からの流入を切る。Grok envelope（camelCase）をClaude形へ変換しない。
5. [factory-host-product-matrix.md](factory-host-product-matrix.md)にGrok親列がある。各セルは実測どおり`required` / `optional` / `unsupported` / `not_applicable`だけを使う。
6. MacとFOX WSL2で、新規Grok sessionが憲法・工場MCP・工場skillを自前面から読む。Windows nativeのGrok Buildは現行どおり`unsupported`。

Wave 1〜5がdotagentsで閉じる範囲。Wave 6は製品repoであり、本計画の完了条件に含めず導線だけ置く。

## 2. 現状（着手時点の事実）

- Grokは既定でClaude互換スキャナを全部ONにする。projectの`AGENTS.md` / `CLAUDE.md`、`~/.claude/CLAUDE.md`、`~/.claude/skills`、`~/.claude/settings.json` hook、`~/.claude.json` MCPを吸う。
- dotagentsに`grok/`ツリーはない。`install.sh`はClaude/Codexだけ。constitution generatorのhostは2つ。`~/.grok/skills`と`~/.grok/hooks`は空。`~/.grok/config.toml`の工場MCPはほぼ無い。
- 2026-08-14裁定: Spotter / Throughlineは正式Grok host化を棄却し、Claude hookへ流入したGrok envelopeを副作用前のunsupported no-opにした。Observerは同provider family専用でGrok面を持たない。
- 2026-08-16のGrok親sessionでもaiterm / lattice / aishell / gpt_connector / codex-sidecarはhandshake失敗だった。会話が成立することと工場が届いていることは別である。

## 3. 裁定

1. **終着はnative面。** Claude面を読むことをGrok親の正規契約にしない。compatは移行中の一時状態だけとし、所有面が立ったセルから切る。
2. **一波一所有面。** 憲法、skill、MCP、hookを同じcommitで全部切らない。切るのは、その面のGrok所有が`install`とfocused gateで証明された後だけ。
3. **共通憲法は判断だけ。** host固有のツール入口（aiterm PTYのMCP名、Claude Workflow/Agent matcher、Grok native terminal）は各deltaへ移す。Claude/Codexの現行挙動はdeltaへ移すだけであり、黙って変えない。
4. **個人MCPは移さない。** Gmail等はオーナーのClaude jsonに残してよい。`compat.claude.mcps`を工場MCPの所有のために全部は切らない。工場サーバはGrok tomlが正本で、同名がClaude jsonからも上がるならGrok側で工場名をdisableし二重起動しない。
5. **製品host化は親host化と分けないで混ぜない。** Spotter正式Grok hostは8/14棄却を維持する。ThroughlineのGrok captureとObserverのGrok familyはWave 6の製品repo作業であり、本計画のdotagents完了を待たないが、Wave 1〜5の受入条件にもしない。
6. **Pluginsは非採用。** 個人git＋symlink配布とmarketplaceを二重化しない。
7. **親のmodel×effortは触らない。** `apply-grok-config`は工場MCP、compatセル、工場hook entryだけを扱い、`[models]`とpermissionとloginを書き換えない。
8. **Windows nativeは対象外。** host matrixのGrok Build `unsupported`を変えない。
9. **工程正本は本Markdown。** Lattice planはオーナー指示があるまで作らない。

### 面ごとの所有

| 面 | Grok所有 | Claude面から切る時期 | やらないこと |
|---|---|---|---|
| 憲法 | `grok/AGENTS.delta.md` → 生成`grok/AGENTS.md` → `~/.grok/rules/AGENTS.md` | Wave 1。`compat.claude.agents=false` | リポの`AGENTS.md`/`CLAUDE.md`を隠すこと |
| Skills | `grok/skills/` → `~/.grok/skills` | Wave 2。`compat.claude.skills=false` | Codex `~/.agents/skills`の削除。同名はdiscovery優先を実測して影を防ぐ |
| Commands | 対応skillの明示invocation。必要なら`~/.grok/commands` | Wave 2 | Claude slashの模造 |
| MCP | 工場分だけ`~/.grok/config.toml` | Wave 3。工場名の二重起動だけ止める | 個人MCPの強制移管、`compat.claude.mcps`の全切断 |
| Config | `apply-grok-config`（dry-run / backup / `--apply`） | Wave 3 | model・login・permissionの自動変更 |
| Hooks | `~/.grok/hooks`。envelopeはGrok camelCaseのまま読む | Wave 4。`compat.claude.hooks=false` | Claude hookの丸コピー、payloadのClaude形canonicalize |
| Subagents | `grok/agents/` → `~/.grok/agents` | Wave 2 | bundled explore/planの置換 |
| Sessions | Throughline Grok capture（製品repo） | Wave 6 | Wave 1〜5でcaptureを成功扱いすること |
| Plugins | 非採用 | — | marketplaceを工場配布にすること |
| 製品connector | host matrixのGrok親列 | Wave 5で列を公開し、実測どおり書く | Spotter/ObserverをWave 5でrequiredに上げること |

## 4. Wave

各waveは独立commit、focused gate、個別revertが可能な単位。次のwaveのcompat切断は前のwaveの受入後だけ。

### Wave 0 — 正本（本commit）

- 本計画を`docs/`へ置く。
- [00_overview.md](00_overview.md)と[plan_factory-master.md](plan_factory-master.md)から導線を張る。
- 製品コード・install・configは触らない。

### Wave 1 — 憲法と配布の骨格

**F:** 3 host化。共通憲法のhost固有ツール入口をdeltaへ移す。`compat.claude.agents`切断。
**A:** generator、`grok/`、`install.sh`、`verify-install`、constitution test、layout/READMEの最小追記。
**H:** このMacで`install.sh`再実行のあと、新規Grok sessionで憲法が`~/.grok/rules/AGENTS.md`だけから乗ること。

受入:

- `node bin/render-global-constitution.mjs --check`が3 hostで通る。
- `make test-constitution`が`grok/`を含む。
- 隔離HOMEのinstallが`~/.grok/rules/AGENTS.md`と`~/.grok/runbooks`を本リポ向きsymlinkにする。
- 新規Grok sessionのuser rulesにClaude delta固有条文が無い。人格（ベル）と共通原則は残る。
- Claude/Codex親の生成物と挙動は、deltaへ移した条文を含めて不変。

### Wave 2 — skill / command / agent

**A:** `grok/skills`（orchestrate / auto-deploy-on-push / polish-github / gpt-connector。入口はGrok appendix、契約は`shared/orchestrate`）、`grok/agents`（implementer / refuter）。
**F:** `~/.agents/skills`との同名shadowを実測する。`~/.grok/skills`が同名に勝てば`compat.claude.skills`は切らない（peertable等のClaude専用skillを落とさない）。勝てない時だけ切断またはignoreを取る。

受入:

- Grokが工場skillを`~/.grok/skills`から列挙する。
- 同名のCodex skillがGrok appendixを影で消さない。消すならGrok側のdiscovery優先を変えるか、Codex面をGrokのscan対象から外す。推測で切らない。
- bundled skill（imagine等）は残す。工場skillで上書きしない。

### Wave 3 — 工場MCP

**A:** `docs/07_grok-fragments.md`と`apply-grok-config`。工場6サーバをstdioで`~/.grok/config.toml`へ冪等追加。
**H:** `--apply`。適用後に`grok mcp doctor`（または同等）で工場サーバの起動を見る。
**F:** 工場名がClaude jsonと二重ならGrok側でcompat由来をdisableする。個人サーバは残す。

受入:

- caveat / lattice / aiterm / aishell / gpt_connector / codex-sidecarがGrok toml由来で列挙される。
- このMacの新規sessionで工場MCPのhandshakeが`supported`か、失敗理由がtypedで残る。失敗を登録成功へ丸めない。
- `[models]`とpermissionとloginがapply前後で変わらない。

### Wave 4 — 工場hook

**A:** `~/.grok/hooks`にdotagents所有hookだけを置く。読むのはGrok camelCase。対象はgit-destroy-gate、delegation-gate、todo-gate、onset-gate、lattice-gantt、plan-gate、orchestrate-advisory。
**F:** `compat.claude.hooks=false`。Claude/Codex経路は不変。Spotter / Throughline / Caveatの製品hookはGrokで起動しない（8/14のno-opを維持）。

受入:

- Claude `settings.json`のhookがGrok sessionに現れない。
- 工場hookがGrok envelopeで副作用前に落ちない（GF01のSpotter exit 2 / Stop 8回継続を再発させない）。
- PreToolUse拒否とStop continuationの負系fixtureをdotagents側に置く。製品repoのGrok host enumは増やさない。

### Wave 5 — 親として閉じる

**F:** host matrixにGrok親列を追加し、Wave 1〜4の実測を書く。
**A:** READMEランブック、`setup-macos-factory` / `setup-wsl-factory`の任意Grok配線、`verify-install`のGrok面。
**H:** MacとFOX WSL2で新規Grok sessionの受入。Windows nativeはGrokを入れない。

受入:

- Grok親列の各セルに、requiredにする根拠の実測がある。根拠が無いセルは`unsupported`または`not_applicable`のまま残す。
- 一撃展開はGrok未loginでも止まらない（toolchain optionalのまま）。login済みならWave 3の工場MCPを適用する。

### Wave 6 — 製品repo（本計画の外側、導線のみ）

着手は別H。dotagents Wave 5の完了を製品着手の前提にしないが、親面が無い状態で製品を正式host化しない。

| 製品 | 内容 | 今の状態 |
|---|---|---|
| Throughline | Grok turnのcapture / restore / handoff | CLI到達はsupported。hook captureはしない |
| Observer | Grok provider familyの伴走 | 同family専用。Grok面なし |
| Spotter | 正式Grok host | 棄却維持。新しい監査要求が出るまで開かない |

## 5. 非目標

- Composerをlive catalog不在のまま使う、またはGrokへfallbackする。
- gpt-connectorの多provider化。
- Grok marketplace / pluginを工場の配布面にする。
- 共通canonicalizerでGrok payloadをClaude形にする。
- Windows nativeへGrok Buildをrequiredにする。
- 8/14のGF07 12製品matrixを、本計画の完了前に書き換えない。

## 6. 既知の罠

- Grok Stopのexit 2は最大8回継続する。Claude hookを切る前に工場hookへ丸コピーするとGF01が再発する。
- `install.sh`は実ファイルをSKIPする。`~/.grok/rules/AGENTS.md`が実ファイルだと正本化が静かに不成立。
- Codex公式skill面`$HOME/.agents/skills`はGrokが`.agents`として別スキャンする。`compat.codex`はinertでもここは生きる。
- `apply-*-config --apply`は端末承認後。backupなしで`config.toml`を触らない。
- 既存Grok sessionはconfig/hook変更を引き継がない。受入は新規sessionだけ。

## 7. 検証

Wave内は変更に直結するfocusedだけ。関連gateはwave完了時に1回。`make ci`はWave 5の最終確認と、複数waveをまとめて閉じる時だけ。

| Wave | focused | 関連 | 人の目 |
|---|---|---|---|
| 1 | `make test-constitution`、install隔離HOMEのGrok rules | `make lint-constitution`、`make lint-md` | 新規Grok sessionでClaude deltaが乗っていない |
| 2 | installのGrok skills/agents、skill smoke | `make lint-skills` | `/skills`相当の列挙 |
| 3 | apply-grok-configのdry-run/backup/冪等test | `make test-install` | `grok mcp doctor` |
| 4 | Grok envelopeの負系fixture、Claude/Codex hook smoke不変 | `make lint-hooks` | 新規sessionでClaude hookが無い |
| 5 | verify-install Grok面、setupの未login通過 | `make ci` 1回 | MacとWSL2の新規session |

Phase完了時の重い監査はWave 5のあと1回。検証者は親と異なるprovider（ClaudeまたはCodex）。Wave 1〜4の完了候補は統括自身のdiff確認で閉じる。

## 8. F / A / H

- **F:** 3 host憲法、共通→deltaの条文移動、compat切断、host matrix Grok親列、8/14 Spotter棄却の維持、工場MCPの失敗を丸めないこと。
- **A:** generator拡張、`grok/`エントリ、install/verify、apply-grok-config、Grok appendix、hook adapter。
- **H:** `install.sh`の実HOME適用、`apply-grok-config --apply`、compat切断後の新規session確認、Wave 6の製品repo着手、Grok login。

Control RecordはWave 1の最初の実装Taskで`init`する。本Wave 0はdocs正本だけなのでControlを作らない。

## 9. 現在地

Wave 4隔離証明済み（2026-08-16）。`~/.grok/hooks/factory.json` に工場7 hook。隔離HOMEの `grok inspect` で enabled はすべて `source.type=user` / `.grok/hooks`。Claude settings の sentinel は `vendor=claude` `disabled`。`externalCompat.claude.hooks.enabled=false`。実HOMEの `install.sh` と `apply-grok-config --apply` はH。Wave 5 / Wave 6 には入らない。
