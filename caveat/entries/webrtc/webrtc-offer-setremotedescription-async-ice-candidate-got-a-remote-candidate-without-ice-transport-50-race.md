---
id: webrtc-offer-setremotedescription-async-ice-candidate-got-a-remote-candidate-without-ice-transport-50-race
title: 'WebRTC: offer setRemoteDescription async 完了前に到着した ICE candidate が "Got a remote candidate without ICE transport" で 50+ 連続失敗する race'
visibility: public
confidence: reproduced
outcome: impossible
tags:
  - webrtc
  - ice
  - race-condition
  - signaling
  - node-datachannel
environment:
  os: darwin
  arch: arm64
  node: 26.0.0
  webrtc_lib_node: node-datachannel
  webrtc_lib_ios: stasel/WebRTC
  transport: WebRTC DataChannel + Relay signaling
source_project: null
source_session: 2026-05-15T02:04:25.677Z/4a92259206a5
created_at: 2026-05-15
updated_at: 2026-05-15
last_verified: 2026-05-15
---

## Symptom

iPhone (offerer) と Mac Host (answerer) を再 pair した直後 (= signaling 再接続後の最初の 1 回) に、iPhone から飛んでくる ICE candidate が answerer 側で:
```
addRemoteCandidate_failed: "Got a remote candidate without ICE transport"
```
で 50+ 連続失敗する. その後 DC が open しないか、open しても peer state が `.failed → connecting` を行き来する. 通常の (再 pair でない) 初回 pair では発生せず、Mac Host や iPhone 側の再起動 + 再 signaling 後にだけ再現.

## Cause

offerer 側が `createOffer` → `setLocalDescription` → signaling 経由で SDP を送信した直後から ICE gathering が走り、ICE candidate が即時に answerer へ飛び始める. answerer 側は SDP offer を受信してから `setRemoteDescription(offer)` を呼ぶが、これは async promise. **完了前に candidate が到着すると `addIceCandidate` が "ICE transport が無い" 状態で fail** する. 1 回目 pair では SDP 受信から candidate 到着までに偶然 setRemoteDescription が間に合っていたが、再 pair 時は signaling の welcome / pendingSignals replay で candidate が SDP より早く / 同時に flush されるため race が顕在化.

## Resolution

answerer 側で setRemoteDescription 完了まで pendingCandidates queue に貯める実装が必要:
```ts
let remoteDescriptionSet = false;
const pendingCandidates: RtcIceCandidate[] = [];

async function handleOffer(offer) {
  await pc.setRemoteDescription(offer);
  remoteDescriptionSet = true;
  for (const c of pendingCandidates) await pc.addIceCandidate(c);
  pendingCandidates.length = 0;
}

function handleCandidate(c) {
  if (remoteDescriptionSet) pc.addIceCandidate(c);
  else pendingCandidates.push(c);
}
```
codex-link-p2p では未修正のまま archive (POSTMORTEM 4.3 に記録). 同種の WebRTC アプリで signaling reconnect / pendingSignals replay を実装する場合は最初から queue を入れること.

## Evidence

codex-link-p2p Mac Host log で再 pair 直後に `addRemoteCandidate_failed: "Got a remote candidate without ICE transport"` が 50+ 連続出力. iPhone 側 PeerConnection ログでは ICE candidate を正常に flush しており iPhone 側に問題なし. POSTMORTEM.md セクション 4.3.
