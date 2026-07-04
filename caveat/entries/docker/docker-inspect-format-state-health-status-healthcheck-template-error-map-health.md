---
id: docker-inspect-format-state-health-status-healthcheck-template-error-map-health
title: '`docker inspect --format ''{{.State.Health.Status}}''` は healthcheck 未設定コンテナで template error を返す（map に Health キーが無い）'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - docker
  - inspect
  - go-template
  - healthcheck
environment:
  os: win32
  arch: x64
  node: 24.14.0
  container: docker
source_project: null
source_session: 2026-04-29T13:29:37.645Z/b5bcd475df8c
created_at: 2026-04-29
updated_at: 2026-04-29
last_verified: 2026-04-29
---

## Symptom

複数コンテナの health 状態を一括取得しようと `docker inspect --format '{{.State.Health.Status}}' c1 c2 c3` を叩いたら、HC を持たないコンテナのところで `template parsing error: map has no entry for key "Health"` が出てコマンド全体が exit code 1。stderr に部分結果と error が混じって解析が破綻する。

## Cause

healthcheck 未定義のコンテナでは inspect の JSON 出力に `.State.Health` キーがそもそも存在しない（null ではなく `not present`）。Go template はキー欠落を hard error にする。`docker inspect` は複数コンテナを順に処理するが、最初のエラーで非 0 exit する。

## Resolution

複数アプローチ: (a) `--format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}'` で if ガード、(b) `--format '{{json .State.Health}}'` を使って null/欠落を JS/jq 側で吸収、(c) `docker ps --format '{{.Names}}|{{.Status}}'` で Status 文字列の `(healthy)`/`(unhealthy)`/`(starting)` suffix を regex 抽出（HC なしなら suffix が無いだけで error にならない、これがいちばん安全）。

## Evidence

2026-04-29 ServerManager の Layer 4 設計検証中に発覚。複数コンテナへの inspect 一括クエリで HC なしコンテナ (`ddnser` の旧 image) が混じった瞬間に exit 1 + template error。`docker ps` の Status suffix から正規表現で抽出する形に変更して回避。
