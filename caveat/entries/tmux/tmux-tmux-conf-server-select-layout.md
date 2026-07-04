---
id: tmux-tmux-conf-server-select-layout
title: 'tmux: カスタム縦積みレイアウトが幅変更で横カラムに潰れる / .tmux.conf フックは server 起動時のみ読込 / select-layout は固定サイズで再伸縮しない'
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - tmux
  - layout
  - window-resized
  - select-layout
  - hook
  - wsl2
  - terminal
environment:
  os: WSL2 (Linux)
  arch: x64
  node: 22.22.1
  tool: tmux 3.6
  shell: bash
source_project: null
source_session: 2026-06-03T04:10:08.904Z/f0736ba8bfcd
created_at: 2026-06-03
updated_at: 2026-06-03
last_verified: 2026-06-03
---

## Context

WSL2 上で tmux ベースの開発レイアウト(左上ranger/左下モニタ/右claude の3ペイン)を ide シェル関数で起動し、ウィンドウ幅変更でも比率を保つ自動追従を実装中に遭遇。

## Symptom

tmux で「左カラムを上下分割(上=ranger/下=別ペイン) + 右に全高1枚(claude)」のカスタム3ペイン構成を作ると、ウィンドウ幅が変わった瞬間に勝手に横3カラム並びへ潰れ、下側ペインが極端に細く/低くなる(claude が3行などに圧縮)。さらに、~/.tmux.conf のフックを書き換えて新しいターミナルを開いても反映されない。古い(マーク無し)セッションを再アタッチすると潰れた状態が復活する。

## Cause

3点が重なる外部仕様: ①tmux はプリセット以外の手組みレイアウトを、ウィンドウのサイズ変化時に独自ロジックで再配置し、縦分割を横カラムへ崩すことがある。②~/.tmux.conf は tmux サーバ起動時にしか読まれない。新しいクライアント/ターミナルを開いても再読込されないので、設定変更が反映されない。③select-layout に保存済みの固定サイズ・レイアウト文字列(例:160x40向け)を渡しても、別サイズ(240x40)のウィンドウへ伸縮し直してくれない(無視される)。

## Resolution

window-resized フックで、毎回「今のウィンドウサイズ用のレイアウト文字列を生成し直して」select-layout で貼り直す。レイアウト文字列の先頭 checksum は tmux の layout_checksum と同一: 各文字について c=((c>>1)+((c&1)<<15))&0xffff; c=(c+charcode)&0xffff; を回し %04x。文字列形式は `csum,WxH,0,0{LWxH,0,0[topWxH,0,0,paneid,botWxH,0,y,paneid],RWxH,x,0,paneid}`（{}=左右分割, []=上下分割, 末尾数字=pane id 番号, 境界に1セル）。レイアウト文字列は全て ASCII なので checksum は純シェルでも算出可(node 不要)。動いているサーバへは `tmux source-file ~/.tmux.conf` で設定をホットロード。フック登録の確認は `tmux show-hooks -g <hookname>`（無引数の `show-hooks -g` 一覧には window-resized が出ないことがある）。対象ウィンドウの判別には各ペインのユーザオプション(例 set -p @role)を使うと安定。

## Evidence

隔離ソケットで再現: 80列幅で stacked(ranger上80x27/monitor下80x12/claude右79x40) を作り、resize-window で240幅にすると、フック無しでは %0=80x40,%2=L81 79x40,%1=L161 79x40 の横3カラムへ崩れた。保存済みの 160x40 レイアウト文字列を 240x40 のウィンドウに select-layout しても崩れたままで復元しなかった。window-resized フックで現サイズ用文字列を生成→select-layout すると 240→ranger120x27/monitor120x12/claude119x40 と正しく復元、100x30 などにも追従した。純シェル checksum が tmux の値(cabe/4de9)と一致。
