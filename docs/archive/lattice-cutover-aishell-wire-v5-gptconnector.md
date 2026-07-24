# Lattice ToDo archive
Plan: aishell-factory-integration
Batch: wire-v5-pm-gptconnector-cutover
Revision: 0f520a57895f670603d4f3a13abda540ee4236bae40ef06a3e8a538ee1332e56

- [ ] gpt-connector `consult`が全呼び出しで失敗するのを修理する。`diagnostics`は`ready`（cdpConnected / officialOrigin / authenticated すべてtrue、bridgeBuildId解決済み）を返すのに、`consult`は添付の有無に関わらず`CHAT_FAILED: Cannot read properties of undefined (reading 'timeStamp')`で落ちる。`timeStamp`はrepo内に存在せずChatGPT webapp側のDOM Event propertyであり、page-bridgeが呼ぶ上流内部関数の契約変更が疑われる。ChatGPT相談レーンが全面停止しており、本waveのPhase gate反証も塞いだ
