# AgentGate Reference Technology Catalog

> Companion research document for `2026-08-26_012753-agentgate-product-architecture-foundation.md`. This is a planning/reference artifact, not approval to install any dependency.

## Decision labels

- **Adopt candidate:** strong fit for the planned foundation; still requires a spike, license review, and measured test.
- **Integrate through adapter:** useful runtime behind a stable AgentGate contract; never couple the product directly to it.
- **Study patterns:** inspect architecture and UX, but do not install or copy wholesale.
- **Deferred candidate:** belongs to voice/presence phases only.
- **Reject for now:** wrong boundary, too heavy, unsafe, or duplicates an existing gate.

## 1. Flow construction and durable orchestration

| Repository | What it proves | AgentGate decision |
| --- | --- | --- |
| [xyflow/xyflow](https://github.com/xyflow/xyflow) | Mature MIT node-based React UI library with React Flow, examples, and Playwright tests. | **Adopt candidate** for the Flow/Loop Constructor after schema/runtime contracts exist. It is presentation only; it must never become the execution engine. |
| [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | Stateful graph-based agent orchestration with cycles and resilience concepts. | **Study patterns** for typed state, checkpoints, conditional cycles, and human interruption. Do not add while Pi-native orchestration can remain smaller. |
| [temporalio/temporal](https://github.com/temporalio/temporal) | Durable workflow service with replay/recovery guarantees. | **Study patterns** for durable Runs and signals. **Reject for foundation** because operating another distributed service is excessive for a single-owner server unless Pi persistence proves insufficient. |
| [PrefectHQ/prefect](https://github.com/PrefectHQ/prefect) | Observable scheduled/event workflows with retries and recovery. | **Study patterns** for Runs, retries, scheduling, and dashboard history. Do not duplicate Pi Jobs or ToolGate Automations. |
| [FoundationAgents/MetaGPT](https://github.com/FoundationAgents/MetaGPT) | Role-based software company and SOP-as-team philosophy. | **Study patterns** for Worker roles, Team templates, artifacts, and review stages; do not adopt its runtime wholesale. |
| [OpenBMB/ChatDev](https://github.com/OpenBMB/ChatDev) | Configurable multi-agent collaboration and zero-code orchestration direction. | **Study patterns** for owner-facing agent/workflow construction and collaboration traces. |
| [camel-ai/camel](https://github.com/camel-ai/camel) | Large-scale multi-agent research, role/task abstractions, and simulated environments. | **Study patterns** for evaluations and group-agent behavior; too broad for a foundation dependency. |
| [agentscope-ai/agentscope](https://github.com/agentscope-ai/agentscope) | Agent framework with an event system, model/tool building blocks, service deployment, channels, and MCP/skill hubs. | **High-priority study** for the AgentGate event bus, service boundary, voice-agent adapter, and Chinese ecosystem practices. Do not replace Pi without a separate benchmark. |
| [QwenLM/Qwen-Agent](https://github.com/QwenLM/Qwen-Agent) | Alibaba Qwen application framework using tool use, planning, memory, MCP cookbooks, RAG, browser assistant, and code interpreter examples. | **High-priority study** for local/Qwen-compatible agent patterns, planning evaluations, and tool calling. |
| [FoundationAgents/OpenManus](https://github.com/FoundationAgents/OpenManus) | Lightweight general-agent implementation influenced by MetaGPT, browser-use, and computer-use tooling. | **Study patterns only** for task loops and capability composition; do not import its broad execution authority. |

### Recommended foundation choice

- UI graph: `@xyflow/react` after Phase 5 contract freeze.
- Runtime: extend Pi with a small versioned Flow/Loop state machine first.
- Persistence: Pi database/checkpoints and immutable trace events.
- Reconsider Temporal only if crash recovery, long-running months-long Runs, or distributed workers exceed Pi's bounded implementation.

## 2. Observability, traces, and evaluations

| Repository | What it proves | AgentGate decision |
| --- | --- | --- |
| [langfuse/langfuse](https://github.com/langfuse/langfuse) | Self-hosted LLM traces, metrics, datasets, prompt management, and evaluations; MIT core with separate enterprise areas. | **Study patterns** and OpenTelemetry mapping. Do not copy private prompts into a second database by default. |
| [Arize-AI/phoenix](https://github.com/Arize-AI/phoenix) | OpenTelemetry-oriented AI traces, datasets, experiments, prompt versions, replay, and evaluations. Licensed under Elastic License 2.0. | **Study patterns** for Run replay and evaluation datasets. Avoid code reuse without license review. |
| [comet-ml/opik](https://github.com/comet-ml/opik) | Tracing, monitoring, evaluations, agent workflows, and production dashboards. | **Study patterns** for feedback/evaluation UX; avoid running another large platform in foundation. |
| [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo) | CLI-driven prompt/model evaluation and red teaming. | **Adopt candidate** as an external evaluation runner for candidate prompt/skill versions. Keep test cases local and redact sensitive context. |
| [confident-ai/deepeval](https://github.com/confident-ai/deepeval) | Apache-licensed Python LLM evaluation framework and metrics. | **Spike candidate** when Python-native evaluation is easier than promptfoo. Choose one primary eval runner after comparison; do not run both permanently. |
| [stanfordnlp/dspy](https://github.com/stanfordnlp/dspy) | Programmatic optimization of LM pipelines rather than manual prompt editing. | **Research/deferred candidate** for mature optimization experiments; never let it publish prompts directly without fixed evals and approval. |
| [agenta-ai/agenta](https://github.com/agenta-ai/agenta) | Open-source prompt management, observability, evaluation, and versioned agent configuration workflows. | **Study patterns** for feedback-to-version workflows, comparisons, and rollback UI. |
| [open-telemetry/opentelemetry-specification](https://github.com/open-telemetry/opentelemetry-specification) | Vendor-neutral trace/span/metric/log semantic model. | **Adopt the concepts**, not necessarily a full collector initially. AgentGate events should map cleanly to traces/spans. |

### Recommended foundation choice

- AgentGate keeps a bounded, redacted event/trace store and versioned evaluation dataset references.
- Use OpenTelemetry-compatible IDs and span relationships.
- Spike promptfoo against five local regression cases before choosing an evaluation framework.
- Langfuse/Phoenix/Opik remain reference UIs unless the native system becomes insufficient.

## 3. Packages, libraries, SBOM, licenses, and updates

| Repository | What it proves | AgentGate decision |
| --- | --- | --- |
| [anchore/syft](https://github.com/anchore/syft) | Apache-licensed SBOM generation for container images, filesystems, archives, OS packages, and many language ecosystems; supports CycloneDX and SPDX. | **Adopt candidate** for normalized package inventory and per-App/container SBOM generation. |
| [anchore/grype](https://github.com/anchore/grype) | Apache-licensed vulnerability scanner for images, filesystems, and SBOMs with OS/language coverage. | **Integrate through SystemGate scanner job** if Syft+Grype is selected. |
| [aquasecurity/trivy](https://github.com/aquasecurity/trivy) | Apache-licensed broad scanner for packages, vulnerabilities, secrets, licenses, misconfiguration, repositories, filesystems, and images. | **Preferred first spike** because one tool covers the widest initial supply-chain surface. Compare output quality and runtime to Syft+Grype. |
| [google/osv-scanner](https://github.com/google/osv-scanner) | Apache-licensed OSV vulnerability scanning across many lockfiles, languages, OS packages, and containers, including guided remediation. | **Adopt candidate** for lockfile-focused vulnerability and upgrade recommendations. |
| [DependencyTrack/dependency-track](https://github.com/DependencyTrack/dependency-track) | SBOM-centered component risk platform. | **Study patterns / defer installation**. It is likely too heavy for the foundation but useful as the UX/data-model reference for components and vulnerability history. |
| [oss-review-toolkit/ort](https://github.com/oss-review-toolkit/ort) | Linux Foundation toolkit for dependency analysis, SBOM, license/compliance policy, attribution, and vulnerability workflows. | **Study patterns** for licensing and policy. Add only if AgentGate becomes a distributed product with real compliance needs. |
| [renovatebot/renovate](https://github.com/renovatebot/renovate) | AGPL-licensed automated dependency discovery and update proposals across many ecosystems. | **Integrate as a proposal generator**, self-hosted and approval-gated. Never enable blind auto-merge for AgentGate or generated Apps. |
| [dependabot/dependabot-core](https://github.com/dependabot/dependabot-core) | GitHub dependency update engine. | **Alternative study** when GitHub-native PRs are enough. Renovate is more flexible for private self-hosted/multi-ecosystem use. |

### Recommended foundation choice

1. Spike Trivy first for image/filesystem/SBOM/vulnerability/license coverage.
2. Spike Syft when a stable CycloneDX/SPDX inventory is required.
3. Use OSV-Scanner for source lockfile remediation detail.
4. Use Renovate to create update branches/PRs only after tests exist.
5. SystemGate runs read-only scanners and returns bounded summaries/SBOM references.
6. ToolGate owns any install/update/rebuild/restart action.
7. AgentGate shows inventory, risk, proposals, test state, approval, rollout, and rollback.

## 4. MCP, hosted Apps, and gateways

| Repository | What it proves | AgentGate decision |
| --- | --- | --- |
| [PrefectHQ/fastmcp](https://github.com/PrefectHQ/fastmcp) | Pythonic MCP server/client/application framework. | **Adopt candidate** for generated App MCP connectors, subject to ToolGate's scope/policy wrapper. |
| [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) | Official reference servers and SDK examples; explicitly reference implementations rather than production-ready solutions. | **Reference only**; copy patterns, then apply AgentGate/ToolGate threat models. |
| [IBM/mcp-context-forge](https://github.com/IBM/mcp-context-forge) | MCP/A2A/API gateway, registry, governance, discovery, proxying, and observability. | **Study patterns** for App connector registry and MCP metadata. Do not replace ToolGate's authority. |
| [microsoft/mcp-gateway](https://github.com/microsoft/mcp-gateway) | Session-aware MCP routing/lifecycle at Kubernetes scale. | **Reject for foundation**; useful only if AgentGate later becomes multi-node. |
| [DIYgod/RSSHub](https://github.com/DIYgod/RSSHub) | Extensible RSS route ecosystem widely used for sources without good feeds. | **Integrate through a bounded research source service** for public feeds where terms permit. Do not give the agent unrestricted scraping. |
| [RSSNext/Folo](https://github.com/RSSNext/Folo) | Modern feed discovery/reader UX paired with RSSHub. | **Study patterns** for Technology Intelligence inbox and deduplication UX; do not duplicate a whole reader initially. |

## 5. Chinese AI agent and application ecosystems

| Repository | What to learn | Decision |
| --- | --- | --- |
| [agentscope-ai/agentscope](https://github.com/agentscope-ai/agentscope) | Unified event bus, agent service, model/tool/TTS abstractions, channels, MCP/skill hubs, and debugging console. | **Weekly high-priority watch** and architecture study. |
| [QwenLM/Qwen-Agent](https://github.com/QwenLM/Qwen-Agent) | Qwen-native planning, memory, tool use, MCP, RAG, browser, code interpreter, and evaluation. | **Weekly high-priority watch** for local model compatibility. |
| [langgenius/dify](https://github.com/langgenius/dify) | Visual AI workflow, RAG, model management, prompt IDE, observability integrations, and product UX. | **Study patterns**; custom license requires review before reuse. |
| [infiniflow/ragflow](https://github.com/infiniflow/ragflow) | Context/RAG engine, agent templates, ingestion workflows, channels, memory, and MCP direction. | **Study context and ingestion UX**; do not duplicate MemoryGate. |
| [FoundationAgents/MetaGPT](https://github.com/FoundationAgents/MetaGPT) | SOP-driven role teams and software-company workflow. | **Study Team/Flow templates**. |
| [OpenBMB/ChatDev](https://github.com/OpenBMB/ChatDev) | Configurable multi-agent systems, DAG collaboration, evolving orchestration. | **Study Flow Constructor and Run presentation**. |
| [FoundationAgents/OpenManus](https://github.com/FoundationAgents/OpenManus) | Lightweight general-agent patterns and rapid product iteration. | **Watch releases; study capability gaps**, not a runtime dependency. |
| [camel-ai/camel](https://github.com/camel-ai/camel) | Multi-agent research, scaling, simulation, and evaluation. | **Research watch**, not product dependency. |
| [labring/FastGPT](https://github.com/labring/FastGPT) | Chinese open-source knowledge/agent application platform. | **Add to watchlist; validate current license/architecture before deeper conclusions.** |
| [1Panel-dev/MaxKB](https://github.com/1Panel-dev/MaxKB) | Chinese enterprise agent/knowledge application UX. | **Add to watchlist; study deployment and admin UX.** |

### Technology Intelligence sources

The weekly intelligence Job should watch public/authorized sources across three layers:

1. **Origin/research:** GitHub releases/trending, arXiv, Hugging Face papers/models/spaces, official vendor blogs, standards and security advisories.
2. **Chinese adaptation/productization:** ModelScope, Gitee, OpenI, GitCode, AgentScope/Qwen/ModelScope repositories, Bilibili technical channels, Zhihu, Juejin, CSDN, InfoQ China, 机器之心, 量子位, PaperWeekly, public WeChat Official Account feeds where lawful/available.
3. **AgentGate synthesis:** deduplicate, verify originals, test small spikes, respect licenses, rank relevance, and let Conker report only high-value findings.

X and Instagram must use official APIs, user-authorized exports, or terms-compliant public feed connectors. Do not build brittle credential scraping into ToolGate.

## 6. Realtime presence, speech, and digital humans (deferred)

| Repository | What it proves | AgentGate decision |
| --- | --- | --- |
| [semperai/amica](https://github.com/semperai/amica) | Browser-oriented AI character/companion composition. | **Deferred study** for Presence mode and component boundaries. Validate active branch/docs before reuse. |
| [Snowfork/Open-LLM-VTuber](https://github.com/Snowfork/Open-LLM-VTuber) | Swappable LLM/ASR/TTS, Live2D, interruption, local/offline operation, and browser rendering. | **Primary deferred reference** for voice-call pipeline and Live2D integration. |
| [Scthe/ai-iris-avatar](https://github.com/Scthe/ai-iris-avatar) | Local Unity 3D avatar, TTS, lip sync, room physics, and remote events. | **Study patterns** for 3D presence and scene events; do not require Unity in foundation. |
| [pixiv/three-vrm](https://github.com/pixiv/three-vrm) | MIT VRM support over Three.js. | **Preferred deferred 3D web adapter candidate** after 2D/voice stabilization. |
| [guansss/pixi-live2d-display](https://github.com/guansss/pixi-live2d-display) | Typed high-level Live2D control on PixiJS/WebGL. | **Deferred 2D adapter candidate**; review Cubism runtime/model licenses carefully. |
| [FunAudioLLM/SenseVoice](https://github.com/FunAudioLLM/SenseVoice) | Multilingual ASR, language ID, emotion, and audio-event tags. | **Deferred benchmark candidate** for developer telemetry and voice understanding. |
| [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Efficient Whisper transcription runtime. | **Deferred baseline** for reliable ASR comparison. |
| [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) | Offline ASR/TTS/VAD/speaker/audio functions across desktop/mobile/embedded platforms. | **High-priority deferred benchmark** because it can cover multiple low-latency speech components. |
| [FunAudioLLM/CosyVoice](https://github.com/FunAudioLLM/CosyVoice) | Chinese-led expressive/streaming speech synthesis ecosystem. | **Deferred TTS benchmark**. |
| [RVC-Boss/GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) | Voice cloning and speech synthesis ecosystem. | **Deferred optional voice-cloning adapter** with consent and licensing controls. |
| [lipku/LiveTalking](https://github.com/lipku/LiveTalking) | Realtime streaming digital human with interruption, WebRTC, multiple avatar engines, TTS options, custom characters, and concurrent sessions. | **High-priority Chinese reference** for call transport, latency, interruption, and digital-human deployment; hardware-heavy, deferred. |
| [TMElyralab/MuseTalk](https://github.com/TMElyralab/MuseTalk) | Realtime audio-driven lip sync at high frame rates on strong GPUs. | **Deferred experimental renderer**, not the initial avatar path. |
| [2noise/ChatTTS](https://github.com/2noise/ChatTTS) | Generative dialogue speech. | **Deferred benchmark**, not an architectural dependency. |
| [huggingface/parler-tts](https://github.com/huggingface/parler-tts) | Prompt-controlled voice characteristics and open training/inference. | **Deferred quality benchmark**. |
| [suno-ai/bark](https://github.com/suno-ai/bark) | Expressive generative speech/nonverbal audio. | **Research only**; too unpredictable/heavy for primary realtime calls. |

## 7. Reference review procedure

Every candidate receives a small review record before adoption:

- repository URL and pinned commit/tag;
- purpose and exact AgentGate feature;
- license and commercial-use notes;
- release cadence and maintenance signals;
- dependency/runtime size;
- CPU/GPU/RAM/disk benchmark;
- network/telemetry behavior;
- secret and permission requirements;
- attack surface and sandbox plan;
- adapter boundary;
- smallest spike;
- success/failure metrics;
- adopt/study/defer/reject decision;
- rollback/removal plan.

No weekly intelligence result installs software automatically. It creates a cited candidate, optional spike proposal, evaluation evidence, and an owner decision.
