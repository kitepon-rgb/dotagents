---
id: sherpa-onnx-kokoro-int8-onnx-onnxruntime-coreml-ep-crashes-at-tts-load-dynamic-output-shape
title: 'sherpa-onnx + Kokoro int8 ONNX: onnxruntime CoreML EP crashes at TTS load (dynamic output shape)'
visibility: public
confidence: reproduced
outcome: impossible
tags:
  - onnxruntime
  - coreml
  - sherpa-onnx
  - kokoro
  - tts
  - ios
  - quantized-int8
  - dynamic-shape
  - execution-provider
  - crash
environment:
  os: darwin
  arch: arm64
  node: 26.3.1
  platform: iOS (arm64, physical device)
  onnxruntime: 1.17.1 (prebuilt static, CoreML EP compiled in)
  sherpa-onnx: ~v1.13 (offline TTS, Kokoro)
  model: Kokoro int8 ONNX (kokoro-int8-en-v0_19, model.int8.onnx) + dynamic shapes
  provider: coreml
source_project: null
source_session: 2026-06-24T10:41:26.152Z/2e7d3d609a1e
created_at: 2026-06-24
updated_at: 2026-06-24
last_verified: 2026-06-24
---

## Context

On-device English TTS. CPU synthesis was the latency bottleneck (~1.8x realtime, ~4s per sentence), so I tried switching the execution provider cpu->coreml as a one-line acceleration. The vendored onnxruntime already had the CoreML EP and sherpa-onnx accepted the provider string, but it crashed at load.

## Symptom

On iOS, switching the sherpa-onnx offline-TTS provider from "cpu" to "coreml" for a Kokoro int8 ONNX model (model.int8.onnx) makes the app crash (SIGABRT) during model load, before any synthesis. The build compiles fine and the provider string is accepted; it dies at runtime in SherpaOnnxCreateOfflineTts.

## Cause

The onnxruntime CoreML Execution Provider must statically resolve every node's output shape at model-build time. Kokoro's graph has a Squeeze output (/Squeeze_output_0) with a dynamic/unknown shape, so the CoreML EP throws Ort::Exception at model_builder.cc:130 RegisterModelInputOutput "Unable to get shape for output: /Squeeze_output_0". sherpa-onnx does NOT catch this C++ exception (its "Available providers ... Fallback to cpu!" path only handles an unavailable GPU/provider, not an EP that throws during model build), so the uncaught exception aborts the process. int8 quantization is secondary; the real blocker is the dynamic shape.

## Resolution

Keep provider="cpu". CoreML is not a drop-in for this model. To actually use CoreML/ANE you must re-export Kokoro with static/fixed output shapes (e.g. fp16 with fixed shapes) or use a CoreML-native Kokoro port — i.e. change the shipped model, not just the provider string. Note also: bumping numThreads (2->4) gave no measurable speedup for this CPU TTS (espeak G2P + ONNX don't parallelize), and CPU synthesis runs ~1.8x slower than realtime. The synth-speed-independent mitigation is prefetch-ahead (synthesize the next utterance in the background during current playback) plus caching synthesized PCM per (text,speed).

## Evidence

Console (physical iPhone, dev build): "libc++abi: terminating due to uncaught exception of type Ort::Exception: model_builder.cc:130 RegisterModelInputOutput Unable to get shape for output: /Squeeze_output_0" followed by "App terminated due to signal 6." Symbol inspection confirmed the prebuilt onnxruntime DOES contain the CoreML EP (CoreMLExecutionProvider symbols) and sherpa-onnx accepts provider "coreml" ("Specify a provider to use: cpu, cuda, coreml") — so availability is not the issue; the model graph is.
