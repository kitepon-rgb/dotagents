---
id: node-24-26-undici-http-1-1-settypeofservice-macos-einval
title: Node 24/26 の undici が全 HTTP/1.1 リクエストで setTypeOfService を無ガード呼び出し→macOS で EINVAL 未捕捉例外＝プロセス即死
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - nodejs
  - undici
  - setTypeOfService
  - EINVAL
  - macos
  - mcp
  - crash
environment:
  os: macOS (Darwin 25.5)
  arch: arm64
  node: 24.18.0 / 26.4.0
  undici: bundled (>=8.5)
source_project: null
source_session: 2026-07-11T04:49:03.115Z/70cb8e33eaa2
created_at: 2026-07-11
updated_at: 2026-07-11
last_verified: 2026-07-11
---

## Symptom

Node プロセスが `Error: setTypeOfService EINVAL (at Socket.setTypeOfService, at writeH1 undici)` の未捕捉例外で即死する。MCP サーバーとして動いている場合は「Connection closed / STDIO connection closed (cleanly)」として静かに見え、原因が掴みにくい。oracle 0.15.2 のブラウザ実行後クリーンアップ中の HTTP 呼び出しで安定的に発生

## Cause

undici の IP 優先度ヒント機能（nodejs/undici PR #4831、2026-03 merge）が writeH1 で `if (socket.setTypeOfService) socket.setTypeOfService(request.typeOfService)` を呼び、request.typeOfService の既定が 0 のため全リクエストで発火。try/catch がなく、macOS の特定ソケット状態で setsockopt が EINVAL を返すとプロセスが死ぬ。Node 24.18.0 と 26.4.0 の両方で再現＝LTS へもバックポート済みでバージョン替えでは逃げられない。単純な fetch（IPv4/IPv6/localhost/https 単発）では再現せず発火条件は未特定

## Resolution

プリロードで net.Socket.prototype.setTypeOfService を try/catch ラップして無害化（QoS ヒントは本来 best-effort）: `node --import 'data:text/javascript,import net from "node:net"; const o=net.Socket.prototype.setTypeOfService; if(o) net.Socket.prototype.setTypeOfService=function(v){try{return o.call(this,v)}catch{ return this }}' <entry.js>`。発動を stderr に記録すると静かなフォールバックにならない。upstream（undici）へのガード追加要望が根本修正

## Evidence


