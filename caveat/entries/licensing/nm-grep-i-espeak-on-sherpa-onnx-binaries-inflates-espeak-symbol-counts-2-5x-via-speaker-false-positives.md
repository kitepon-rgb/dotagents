---
id: nm-grep-i-espeak-on-sherpa-onnx-binaries-inflates-espeak-symbol-counts-2-5x-via-speaker-false-positives
title: nm+grep -i espeak on sherpa-onnx binaries inflates espeak symbol counts ~2.5x via Speaker false positives
visibility: public
confidence: reproduced
outcome: resolved
tags:
  - sherpa-onnx
  - espeak-ng
  - gpl
  - nm
  - grep
  - license-audit
  - false-positive
  - ios
environment:
  os: darwin
  arch: arm64
  node: 26.4.0
source_project: null
source_session: 2026-07-04T15:43:47.474Z/93f3404c6eec
created_at: 2026-07-04
updated_at: 2026-07-04
last_verified: 2026-07-04
---

## Context

License audit of a commercial iOS app bundling sherpa-onnx Kokoro TTS; counting espeak-ng symbols as evidence of GPL contamination.

## Symptom

Auditing a sherpa-onnx static library (e.g. libsherpa-onnx.a) for GPL espeak-ng linkage with `nm -gU lib.a | grep -ic espeak` reports a hugely inflated count (e.g. 166 when only 66 symbols are really espeak-related). License-audit reports based on this number overstate the symbol evidence and can be discredited on review.

## Cause

Case-insensitive `grep -i espeak` matches the substring "eSpeak" inside unrelated speaker-diarization/speaker-embedding symbols: `OfflineSpeakerDiarization*` ("Offlin-eSpeak-er"), `CreateSpeakerEmbeddingExtractor` ("Creat-eSpeak-er"), etc. sherpa-onnx ships both espeak-ng (TTS G2P) and Speaker* APIs in the same archive, so the false positives are systematic.

## Resolution

Exclude the false positives: `nm -gU lib.a | grep -i espeak | grep -iv speaker`. For definitive evidence of espeak-ng static linkage, look for the raw espeak-ng C API symbols instead: `nm -gU lib.a | grep -E "_espeak_(ng_)?(Initialize|Synth|TextToPhonemes|SetVoice)"` (object espeak_api.c.o). The conclusion (espeak-ng is statically linked) is unaffected; only the count changes.

## Evidence

Reproduced 2026-07-05 on sherpa-onnx iOS xcframework (ios-arm64 libsherpa-onnx.a): grep -ic espeak = 166; of those, grep -ic speaker = 100 (all Speaker-diarization/embedding APIs); genuine espeak symbols = 66 incl. _espeak_ng_Initialize, _espeak_TextToPhonemes, _espeak_ng_SetVoiceByName. Found by adversarial re-verification of a license audit that had cited "166 espeak symbols".
