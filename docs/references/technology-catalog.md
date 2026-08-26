# AgentGate Technology Reference Catalog

> Inclusion is not approval to install a dependency. Every adopted candidate requires a measured spike, pinned version, license/security review, resource benchmark, adapter boundary, and removal plan.

## Decisions

- **Adopt candidate:** strong fit after a measured spike.
- **Integrate through adapter:** useful behind a stable AgentGate/Gate contract.
- **Study patterns:** architectural or UX reference only.
- **Deferred:** belongs to future voice/presence phases.
- **Reject for now:** wrong boundary, unsafe, too heavy, or duplicates an existing Gate.

The expanded research artifact remains at `.hermes/plans/2026-08-26_012753-agentgate-reference-technology-catalog.md`.

## Flows, Loops, and orchestration

| Repository | Decision |
| --- | --- |
| [xyflow/xyflow](https://github.com/xyflow/xyflow) | **Adopt candidate** for the React Flow/Loop Constructor UI; never the execution engine. |
| [langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) | **Study** typed state, cycles, checkpoints, and human interruption. |
| [temporalio/temporal](https://github.com/temporalio/temporal) | **Study durability**; reject for foundation unless Pi cannot support required recovery. |
| [PrefectHQ/prefect](https://github.com/PrefectHQ/prefect) | **Study** Runs, retries, scheduling, and history. |
| [FoundationAgents/MetaGPT](https://github.com/FoundationAgents/MetaGPT) | **Study** SOP-driven Worker/Team/Flow patterns. |
| [OpenBMB/ChatDev](https://github.com/OpenBMB/ChatDev) | **Study** configurable multi-agent collaboration and visual orchestration. |
| [camel-ai/camel](https://github.com/camel-ai/camel) | **Research watch** for multi-agent evaluation/simulation. |
| [agentscope-ai/agentscope](https://github.com/agentscope-ai/agentscope) | **High-priority study** for event bus, agent service, channel, model/tool, and MCP/Skill abstractions. |
| [QwenLM/Qwen-Agent](https://github.com/QwenLM/Qwen-Agent) | **High-priority study** for planning, memory, tools, MCP, RAG, and Qwen/local compatibility. |
| [FoundationAgents/OpenManus](https://github.com/FoundationAgents/OpenManus) | **Study only** for task loops and capability composition. |

Recommended foundation: `@xyflow/react` for presentation and a small versioned Pi-native Flow/Loop runtime.

## Observability, feedback, and evaluation

| Repository | Decision |
| --- | --- |
| [langfuse/langfuse](https://github.com/langfuse/langfuse) | **Study** trace/prompt/evaluation UX and OpenTelemetry integration. |
| [Arize-AI/phoenix](https://github.com/Arize-AI/phoenix) | **Study** datasets, experiments, replay, and prompt versions; review Elastic License before reuse. |
| [comet-ml/opik](https://github.com/comet-ml/opik) | **Study** agent trace/evaluation dashboards. |
| [promptfoo/promptfoo](https://github.com/promptfoo/promptfoo) | **Adopt candidate** for local prompt/model regression evaluation. |
| [confident-ai/deepeval](https://github.com/confident-ai/deepeval) | **Comparison spike** against promptfoo; select one primary runner. |
| [stanfordnlp/dspy](https://github.com/stanfordnlp/dspy) | **Deferred research** for programmatic optimization after evaluation maturity. |
| [agenta-ai/agenta](https://github.com/agenta-ai/agenta) | **Study** feedback-to-version, comparisons, and rollback UX. |
| [OpenTelemetry specification](https://github.com/open-telemetry/opentelemetry-specification) | **Adopt concepts** for trace/span/event identifiers. |

AgentGate initially keeps bounded redacted native traces. It does not duplicate every private prompt into another platform.

## Packages, libraries, SBOMs, licenses, and updates

| Repository | Decision |
| --- | --- |
| [aquasecurity/trivy](https://github.com/aquasecurity/trivy) | **Preferred first spike** for broad package/image/filesystem/SBOM/vulnerability/license coverage. |
| [anchore/syft](https://github.com/anchore/syft) | **Adopt candidate** for normalized CycloneDX/SPDX SBOMs. |
| [anchore/grype](https://github.com/anchore/grype) | **Comparison/integration candidate** for vulnerability scanning over Syft SBOMs. |
| [google/osv-scanner](https://github.com/google/osv-scanner) | **Adopt candidate** for lockfile vulnerabilities and remediation detail. |
| [DependencyTrack/dependency-track](https://github.com/DependencyTrack/dependency-track) | **Study/defer installation**; useful component-risk UX/data reference. |
| [oss-review-toolkit/ort](https://github.com/oss-review-toolkit/ort) | **Study** licensing/compliance and attribution workflows. |
| [renovatebot/renovate](https://github.com/renovatebot/renovate) | **Proposal engine candidate**; approval-gated, no blind auto-merge, AGPL review required. |
| [dependabot/dependabot-core](https://github.com/dependabot/dependabot-core) | **Alternative study** for GitHub-native update PRs. |

SystemGate observes/scans, AgentGate presents, ToolGate executes approved updates, CI proves build/test/security, and every deployment preserves rollback.

## MCP, hosted Apps, and source monitoring

| Repository | Decision |
| --- | --- |
| [PrefectHQ/fastmcp](https://github.com/PrefectHQ/fastmcp) | **Adopt candidate** for scoped App MCP connectors behind ToolGate. |
| [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) | **Reference only**; examples are not automatically production safe. |
| [IBM/mcp-context-forge](https://github.com/IBM/mcp-context-forge) | **Study** registry, governance, discovery, proxy, and observability patterns. |
| [microsoft/mcp-gateway](https://github.com/microsoft/mcp-gateway) | **Reject for foundation**; Kubernetes-scale lifecycle is unnecessary. |
| [DIYgod/RSSHub](https://github.com/DIYgod/RSSHub) | **Bounded connector candidate** for public feeds where terms permit. |
| [RSSNext/Folo](https://github.com/RSSNext/Folo) | **Study** discovery, feed, and deduplication UX. |

Human Apps use authenticated HTTP/WebSocket APIs. AI access uses ToolGate→MCP. Apps request AI through the central AgentGate AI Broker rather than embedding provider keys.

## Chinese AI ecosystem watchlist

High-priority weekly sources:

- [AgentScope](https://github.com/agentscope-ai/agentscope)
- [Qwen-Agent](https://github.com/QwenLM/Qwen-Agent)
- [Dify](https://github.com/langgenius/dify)
- [RAGFlow](https://github.com/infiniflow/ragflow)
- [MetaGPT](https://github.com/FoundationAgents/MetaGPT)
- [ChatDev](https://github.com/OpenBMB/ChatDev)
- [OpenManus](https://github.com/FoundationAgents/OpenManus)
- [CAMEL](https://github.com/camel-ai/camel)
- [FastGPT](https://github.com/labring/FastGPT)
- [MaxKB](https://github.com/1Panel-dev/MaxKB)

Also monitor public/authorized ModelScope, Gitee, OpenI, GitCode, Bilibili technical sources, Zhihu, Juejin, CSDN, InfoQ China, 机器之心, 量子位, PaperWeekly, and WeChat Official Account feeds where lawful/available.

## Deferred voice and character presence

- [semperai/amica](https://github.com/semperai/amica)
- [Snowfork/Open-LLM-VTuber](https://github.com/Snowfork/Open-LLM-VTuber)
- [Scthe/ai-iris-avatar](https://github.com/Scthe/ai-iris-avatar)
- [pixiv/three-vrm](https://github.com/pixiv/three-vrm)
- [guansss/pixi-live2d-display](https://github.com/guansss/pixi-live2d-display)
- [FunAudioLLM/SenseVoice](https://github.com/FunAudioLLM/SenseVoice)
- [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx)
- [FunAudioLLM/CosyVoice](https://github.com/FunAudioLLM/CosyVoice)
- [RVC-Boss/GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS)
- [lipku/LiveTalking](https://github.com/lipku/LiveTalking)
- [TMElyralab/MuseTalk](https://github.com/TMElyralab/MuseTalk)
- [2noise/ChatTTS](https://github.com/2noise/ChatTTS)
- [huggingface/parler-tts](https://github.com/huggingface/parler-tts)
- [suno-ai/bark](https://github.com/suno-ai/bark)

These are reference/deferred candidates. No voice, camera, Live2D, VRM, Three.js, digital-human, or emotion runtime enters the foundation release.

## Adoption checklist

Before adopting any reference:

- pin repository tag/commit;
- verify license and commercial restrictions;
- inspect maintenance/release cadence;
- benchmark CPU/GPU/RAM/disk/runtime;
- inspect telemetry/network behavior;
- identify secrets and permissions;
- define adapter boundary;
- run the smallest spike;
- define success/failure measurements;
- document removal and rollback.

Weekly intelligence may create a cited candidate or spike proposal. It may not install software automatically.
