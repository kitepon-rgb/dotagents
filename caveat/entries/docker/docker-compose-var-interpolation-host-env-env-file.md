---
id: docker-compose-var-interpolation-host-env-env-file
title: docker compose の `${VAR}` interpolation は host env 経由のみ — env_file の値は展開されない
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - docker-compose
  - interpolation
  - env_file
  - healthcheck
environment:
  os: win32
  arch: x64
  node: 24.14.0
source_project: null
source_session: 2026-04-29T11:26:29.709Z/c6e1b3581c02
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

compose.yaml の `healthcheck` や `command` 内に `${MY_TOKEN}` と書き、`env_file: .env` で MY_TOKEN を渡しているのに warning `WARN The "MY_TOKEN" variable is not set. Defaulting to a blank string.` が出て空文字に展開される。コンテナ内 env としては正しく設定されているが yaml interpolation は空のまま。</symptom>
<parameter name="cause">docker compose の `${VAR}` interpolation は **compose CLI 起動時の host shell の env** を見る。`env_file:` で指定した値はコンテナ内の env としては設定されるが、compose ファイル内の interpolation には参加しない (時系列としても interpolation の方が先に行われる)。</cause>
<parameter name="resolution">healthcheck 等の shell コマンド内で env を展開したい場合は **`$$VAR` で escape** してコンテナ内 shell に展開させる。例: `test: ["CMD-SHELL", "curl -H \"X-Token: $$MY_TOKEN\" ..."]` — compose は `$$` を `$` に変換して shell に渡し、shell が `$MY_TOKEN` を env_file 経由の値で展開する。host 経由で渡したい場合は `docker compose up` 前に `export MY_TOKEN=...` するか `--env-file` フラグ。</resolution>
<parameter name="evidence">`time="2026-04-29T09:44:43Z" level=warning msg="The \"BELL_INTERNAL_TOKEN\" variable is not set. Defaulting to a blank string."` が compose up 時に毎回出る。`$${VAR}` に書き換えで warning 消滅 + 動作。</evidence>
<parameter name="environment">{"docker_compose": "v2.x / v5.x", "context": "healthcheck CMD-SHELL or other inline shell"}

## Cause



## Resolution



## Evidence


