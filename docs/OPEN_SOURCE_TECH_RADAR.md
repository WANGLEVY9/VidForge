# VidForge Open-source Technology Radar

> Research snapshot: 2026-08-13 · 56 official repositories and project docs reviewed for transferable ideas.

This radar is a product and engineering input, not a dependency shopping list. Each project is
linked to its official repository. The transfer idea describes a bounded capability that can be
implemented behind VidForge's existing service boundaries. Before adding code or a dependency,
check the current license, model terms, attribution requirements, security posture, and runtime
cost again.

## How to read the radar

- **Adopt**: a low-risk interface or practice that fits the current TypeScript/NestJS/React stack.
- **Adapt**: a useful pattern that needs a VidForge-specific contract or a different runtime.
- **Reference**: an architectural or UX idea; do not copy implementation code without a license review.
- GPL/AGPL or model-specific terms are intentionally treated as integration boundaries. VidForge's
  MIT license does not automatically make a third-party dependency MIT-compatible.

## 1. Streaming, transport, and playback

| Project                                                       | Transferable strength                                         | VidForge application                                             | Mode      |
| ------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- | --------- |
| [LiveKit](https://github.com/livekit/livekit)                 | Production WebRTC SFU, auth, simulcast, SVC and observability | A `PreviewTransport` contract for low-latency generated previews | Adapt     |
| [SRS](https://github.com/ossrs/srs)                           | Broad RTMP/WebRTC/HLS/HTTP-FLV/SRT protocol coverage          | Ingest/export capability matrix and deployment profiles          | Reference |
| [MediaMTX](https://github.com/bluenviron/mediamtx)            | Clear path, CORS, proxy, recording and token configuration    | Safe stream endpoint policy and per-workspace preview routes     | Adapt     |
| [LiveKit Ingress](https://github.com/livekit/ingress)         | Normalizes RTMP, WHIP, files and HLS into one media room      | Import adapters that emit one canonical asset event              | Adapt     |
| [Pion WebRTC](https://github.com/pion/webrtc)                 | Small, composable WebRTC primitives and metrics hooks         | Server-side media probes and future Go worker boundary           | Reference |
| [Janus](https://github.com/meetecho/janus-gateway)            | Plugin-oriented WebRTC gateway and token auth                 | Optional gateway profile for self-hosted installations           | Reference |
| [GStreamer](https://github.com/GStreamer/gstreamer)           | Pipeline graph and plugin-based media processing              | Model a render graph as typed media stages                       | Reference |
| [FFmpeg](https://github.com/FFmpeg/FFmpeg)                    | Codecs, containers, filters, probing and streaming tools      | Keep FFmpeg behind validated command builders and probes         | Adopt     |
| [hls.js](https://github.com/video-dev/hls.js)                 | Browser HLS client with recovery and adaptive levels          | Resilient VOD/live playback component in the preview surface     | Adopt     |
| [Shaka Player](https://github.com/shaka-project/shaka-player) | DASH/HLS, MSE/EME and offline browser playback                | Compare playback capability before choosing a player dependency  | Reference |
| [AndroidX Media3](https://github.com/androidx/media)          | Modular ExoPlayer successor and media-session abstractions    | Future mobile/player client contract                             | Reference |
| [ZLMediaKit](https://github.com/ZLMediaKit/ZLMediaKit)        | High-performance C++ live media server                        | Evaluate for a self-hosted edge profile, not the web core        | Reference |
| [PeerTube](https://github.com/Chocobozzz/PeerTube)            | Federated video hosting and decentralized distribution        | Community showcase and public artifact sharing concepts          | Reference |
| [Jellyfin](https://github.com/jellyfin/jellyfin)              | Self-hosted library, metadata and playback experience         | Asset library information architecture and metadata refresh jobs | Reference |

## 2. Video generation and controllable models

| Project                                                                          | Transferable strength                                        | VidForge application                                            | Mode      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- | --------- |
| [Wan2.1](https://github.com/Wan-Video/Wan2.1)                                    | T2V, I2V, editing and video-to-audio model family            | Provider adapter with capability and VRAM declarations          | Adapt     |
| [Open-Sora](https://github.com/hpcaitech/Open-Sora)                              | Open end-to-end generation, training and evaluation pipeline | Separate inference, dataset and evaluation concerns             | Reference |
| [ComfyUI](https://github.com/comfyanonymous/ComfyUI)                             | Explicit node graph, workflow JSON and API execution         | Exportable render graphs and reproducible workflow snapshots    | Adapt     |
| [Diffusers](https://github.com/huggingface/diffusers)                            | Unified pipeline/components plus memory offload strategies   | Provider-neutral generation interface and resource hints        | Adopt     |
| [HunyuanVideo](https://github.com/Tencent-Hunyuan/HunyuanVideo)                  | Prompt rewrite, 3D VAE and multi-GPU/FP8 inference           | Prompt preparation node and hardware-aware execution plan       | Adapt     |
| [HunyuanVideo-1.5](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5)          | Distilled low-step generation and consumer-GPU focus         | Fast preview mode distinct from final-quality render            | Adapt     |
| [VACE](https://github.com/ali-vilab/VACE)                                        | Unified video generation, editing and composition inputs     | Mask/reference/conditioning asset roles in the storyboard       | Adapt     |
| [HunyuanVideo-Avatar](https://github.com/Tencent-Hunyuan/HunyuanVideo-Avatar)    | Multimodal avatar customization                              | Explicit consent and identity-safety gate for avatar tasks      | Reference |
| [LTX-Video](https://github.com/Lightricks/LTX-Video)                             | Fast text/image-to-video generation                          | Local preview provider for low-latency iteration                | Adapt     |
| [LTX-Desktop](https://github.com/Lightricks/LTX-Desktop)                         | User-friendly desktop T2V/I2V/audio/video-edit flow          | Progressive disclosure for local vs API runtime choices         | Reference |
| [CogVideo](https://github.com/THUDM/CogVideo)                                    | 3D VAE, prompt alignment and model-family recipes            | Quality presets with model-specific prompt guidance             | Adapt     |
| [Video-As-Prompt](https://github.com/bytedance/Video-As-Prompt)                  | Semantic control and preference optimization                 | Represent reference motion/semantic intent separately from text | Reference |
| [AnimateDiff](https://github.com/guoyww/AnimateDiff)                             | Motion modules reusable across image-generation backbones    | Motion/style controls as versioned workflow inputs              | Reference |
| [Stability generative-models](https://github.com/Stability-AI/generative-models) | Open model implementations and inference recipes             | License-aware provider registry and model provenance            | Reference |
| [MMagic](https://github.com/open-mmlab/MMagic)                                   | Broad image/video generation and editing toolkit             | Compare task capabilities through a provider capability schema  | Reference |

## 3. Editing, rendering, and media intelligence

| Project                                                     | Transferable strength                                      | VidForge application                                                 | Mode      |
| ----------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- | --------- |
| [Remotion](https://github.com/remotion-dev/remotion)        | React compositions, deterministic rendering and render API | Treat scenes as typed, testable compositions                         | Adapt     |
| [OpenShot](https://github.com/OpenShot/openshot-qt)         | Accessible timeline, proxies, keyframes and transitions    | Expose timeline concepts without forcing a desktop editor            | Reference |
| [Olive](https://github.com/olive-editor/olive)              | Hardware-accelerated non-linear editing model              | Benchmark timeline interaction and preview strategy                  | Reference |
| [LosslessCut](https://github.com/mifi/lossless-cut)         | Fast lossless cuts, tracks, waveform and keyboard-first UX | Add a fast trim path before expensive re-encoding                    | Adapt     |
| [Blender](https://github.com/blender/blender)               | Compositing, tracking, 3D and video-sequence workflows     | Future advanced composition/export bridge                            | Reference |
| [Kdenlive](https://github.com/KDE/kdenlive)                 | Proxy workflow, effects and mature timeline conventions    | Document proxy/media quality states in the editor                    | Reference |
| [MoviePy](https://github.com/Zulko/moviepy)                 | Approachable Python compositing and custom effects         | Keep a simple scripting escape hatch for experiments                 | Reference |
| [PyAV](https://github.com/PyAV-Org/PyAV)                    | Precise Python access to containers, packets and frames    | Use for frame-level analysis workers when FFmpeg CLI is insufficient | Adapt     |
| [OpenCV](https://github.com/opencv/opencv)                  | Mature vision, tracking and image-processing primitives    | Thumbnail quality, scene detection and visual QA workers             | Adopt     |
| [SAM 2](https://github.com/facebookresearch/sam2)           | Promptable video segmentation with temporal propagation    | Mask-assisted editing and subject consistency checks                 | Adapt     |
| [CoTracker](https://github.com/facebookresearch/co-tracker) | Point tracking through video                               | Camera/object motion metadata for generation conditioning            | Reference |
| [Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN)       | Practical image/video restoration and upscaling            | Optional final-mile enhancement with explicit cost estimate          | Adapt     |
| [RIFE](https://github.com/hzwer/ECCV2022-RIFE)              | Efficient frame interpolation                              | Preview smoothness/export FPS conversion worker                      | Reference |
| [SadTalker](https://github.com/OpenTalker/SadTalker)        | Single-image audio-driven talking head                     | Provider capability with consent and watermark policy                | Reference |
| [MuseTalk](https://github.com/TMElyralab/MuseTalk)          | Real-time audio-driven lip synchronization                 | Audio-to-lip-sync stage behind a policy-aware adapter                | Reference |

## 4. Agents, workflow, and evaluation

| Project                                                                 | Transferable strength                                         | VidForge application                                               | Mode      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------ | --------- |
| [LangGraph](https://github.com/langchain-ai/langgraph)                  | Stateful graphs, checkpoints and human-in-the-loop interrupts | Persisted run state, approval gates and resumable nodes            | Adopt     |
| [Agent Protocol](https://github.com/langchain-ai/agent-protocol)        | Run/thread/store/stream primitives for agent APIs             | Align async AgentRun responses with a stable run protocol          | Adapt     |
| [AutoGen](https://github.com/microsoft/autogen)                         | Layered agents, message passing and multi-agent patterns      | Use as pattern reference; project is now maintenance mode          | Reference |
| [CrewAI](https://github.com/crewAIInc/crewAI)                           | Role-based agents, delegation, memory and visual builder      | Make VidForge agent roles inspectable and editable                 | Adapt     |
| [Temporal TypeScript SDK](https://github.com/temporalio/sdk-typescript) | Durable execution for long-running workflows                  | Evaluate for production worker execution beyond process-local runs | Reference |
| [LangChain.js](https://github.com/langchain-ai/langchainjs)             | Provider/tool abstractions and streaming callbacks            | Normalize model/tool events at adapter boundaries                  | Adapt     |
| [LlamaIndex](https://github.com/run-llama/llama_index)                  | Data connectors, retrieval and agent context construction     | Product knowledge ingestion and grounded script evidence           | Adapt     |
| [DSPy](https://github.com/stanfordnlp/dspy)                             | Declarative modules and optimization of prompts/programs      | Evaluate script quality through typed prompt programs              | Reference |
| [Letta](https://github.com/letta-ai/letta)                              | Stateful agents with explicit memory management               | Separate workspace memory from transient run state                 | Reference |
| [Haystack](https://github.com/deepset-ai/haystack)                      | Composable retrieval/generation pipelines and evaluation      | Retrieval trace and evidence cards in script review                | Adapt     |
| [OpenHands](https://github.com/All-Hands-AI/OpenHands)                  | Tool-using agent runtime and sandboxed execution              | Safe internal maintenance agents with scoped tools                 | Reference |
| [browser-use](https://github.com/browser-use/browser-use)               | Browser automation with agent-friendly abstractions           | Optional research/import agent, isolated and approval-gated        | Reference |
| [Prefect](https://github.com/PrefectHQ/prefect)                         | Observable Python flows, retries and deployments              | Compare operational patterns for media worker scheduling           | Reference |

## Ten-batch implementation route

1. **Experience foundation** — this batch: public quick experience, research radar, clear product promise.
2. **Design system** — consolidate tokens, app shell, responsive navigation, keyboard and reduced-motion behavior.
3. **Asset studio** — media preview, metadata, deduplication, retry and accessible empty/error states.
4. **Preview transport** — capability detection and a provider-neutral HLS/WebRTC/file preview interface.
5. **Generation providers** — Wan/Hunyuan/LTX adapters, model provenance, hardware and license metadata.
6. **Agent control plane** — durable checkpoints, human approval, tool policy and multi-agent event streams.
7. **Quality loop** — scene/subject/audio checks, prompt consistency, evaluation artifacts and explainable failures.
8. **Production runtime** — queue workers, idempotency, caching, cost budgets, traces and operational dashboards.
9. **Community surface** — examples, templates, reproducible fixtures, contribution paths and public demos.
10. **Release hardening** — performance, security, accessibility, dependency/license audit and release automation.

The order deliberately keeps product clarity ahead of model breadth. A new provider is only valuable
when users can preview, inspect, compare, and recover from its output.
