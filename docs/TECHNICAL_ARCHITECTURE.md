# VidForge Technical Architecture

> **Version**: 2.3 | **Last Updated**: 2026-08-18
> **Project**: E-commerce AIGC Video Generation System

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Module Design](#4-module-design)
   - 4.1 [Material Module](#41-material-module)
   - 4.2 [Script Module](#42-script-module)
   - 4.3 [Creation Module](#43-creation-module)
   - 4.4 [Agent Orchestration](#44-agent-orchestration)
   - 4.5 [Analytics Module](#45-analytics-module)
   - 4.6 [Export Module](#46-export-module)
5. [AI Integration](#5-ai-integration)
6. [Frontend Architecture](#6-frontend-architecture)
7. [Data Storage](#7-data-storage)
8. [Deployment Architecture](#8-deployment-architecture)
9. [Security & Compliance](#9-security--compliance)
10. [CI/CD & Quality Assurance](#10-cicd--quality-assurance)
11. [Observability](#11-observability)

---

## 1. Project Overview

VidForge is an end-to-end AIGC (AI-Generated Content) video production system designed for e-commerce merchants on platforms like TikTok Shop. It enables merchants to automatically generate promotional videos by simply providing product information, with full control over the creative process through material management, script generation, storyboard editing, and intelligent video composition.

**Core Business Value**: Reduce merchant video production time from hours to minutes, with zero technical expertise required, while maintaining creative control through AI-assisted workflows.

**Key Capabilities**:

- Multi-type material management with AI-powered tagging (three-layer taxonomy) and multi-dimensional retrieval (keyword / tag filter / vector similarity / sort)
- Intelligent script generation with RAG-enhanced trending video references and a visual "trend library" drawer
- One-click video creation with shot-level intervention (add/delete/duplicate/reorder/regenerate)
- AI Agent orchestration for fully automated production pipeline with self-reflection and self-learning
- Real-time task progress via WebSocket dual-channel (socket + REST polling)
- Multi-format export with resolution and aspect ratio options (MP4/MOV/WebM/GIF)
- A/B comparison for video performance optimization
- Data dashboard for production analytics (8 chart types, queue monitoring, cost tracking)

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Access Layer                           │
│              Browser (Desktop / Mobile Web)                          │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Frontend (React 18 + Vite)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Material │ │  Script  │ │ Creation │ │Dashboard │ │ A/B Comp │  │
│  │  Page    │ │   Page   │ │   Page   │ │   Page   │ │   Page   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Shared: StoryboardEditor, GlassPanel, VideoPlayer, Charts  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐   │
│  │  Stores  │ │ Services │ │   Hooks  │ │  Layout (Auth/Space) │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │ HTTP / WebSocket
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend API (NestJS)                              │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Material │ │  Script  │ │ Creation │ │  Agent   │ │Analytics │  │
│  │ Module   │ │  Module  │ │  Module  │ │  Module  │ │  Module  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐   │
│  │ Export   │ │  Auth    │ │Compliance│ │  Notification        │   │
│  │ Module   │ │  Module  │ │ Module   │ │  Module              │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  AI Services: ARK Text, ARK Vision, ARK Video, TTS, BGM,    │   │
│  │               FFmpeg (concat/transcode/extractKeyframes/     │   │
│  │               burnSubtitle/mixAudio)                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Agent Orchestrator (LangGraph StateGraph)                   │   │
│  │  MaterialAgent → ScriptAgent → CompositionAgent → Quality   │   │
│  │  Conditional retry (max 2) with self-reflection feedback     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Queue System (BullMQ + explicit dev fallback)                │   │
│  │  5 queues: creation-shot / creation-compose / export-encode  │   │
│  │            / material-analyze / agent-run                     │   │
│  │  agent-run is consumed by a dedicated Agent Worker            │   │
│  │  Redis available → persistent queue; dev-only fallback         │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   PostgreSQL     │ │      Redis       │ │  File Storage    │
│  + pgvector      │ │  (BullMQ Queue)  │ │  (Local Disk)    │
│  (Entities +     │ │  (LangGraph     │ │  /static/uploads │
│   Vector Search + │ │   checkpoints)  │ │  /static/outputs │
│   checkpoints)   │ │  (Cache/WS)      │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     External AI Services                             │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐   │
│  │  Volcengine ARK     │  │  Optional: Ollama (BGE-M3 Embedding)│   │
│  │  - Doubao-Seed-2.0  │  │  (Falls back gracefully)            │   │
│  │  - Doubao-Seedance  │  └──────────────────────────────────────┘   │
│  └─────────────────────┘                                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

- **Separation of Concerns**: Frontend (React) and Backend (NestJS) communicate via REST API + WebSocket
- **Modular Design**: Business logic is organized into independent feature modules
- **Graceful Degradation**: All AI/ML integrations have fallback mechanisms; no single dependency is critical
- **Async Processing**: Long-running media tasks use BullMQ; the Agent workflow is consumed by an independent worker, while inline fallback is development-only and production-like environments fail closed by default
- **Durable Graph State**: LangGraph `PostgresSaver` persists super-step checkpoints under a stable `thread_id`; stale leases are requeued and resumed with null input
- **Provider Side-effect Ledger**: Agent video requests persist a stable idempotency key, request hash and remote task ID so paid external work remains inspectable across worker restarts
- **Agent-Driven Pipeline**: LangGraph orchestrates multi-step AI workflows with self-reflection and feedback loops
- **Observability First**: All AI calls and agent steps emit structured traces for cost monitoring and debugging

---

## 3. Technology Stack

| Layer        | Technology                             | Version | Purpose                                   |
| ------------ | -------------------------------------- | ------- | ----------------------------------------- |
| **Frontend** | React                                  | 18.x    | UI framework                              |
|              | TypeScript                             | 5.x     | Type safety                               |
|              | Vite                                   | 5.x     | Build tool / HMR                          |
|              | Ant Design                             | 5.x     | Component library (full theme adaptation) |
|              | ECharts                                | 5.x     | Data visualization (8 chart types)        |
|              | Zustand                                | 4.x     | State management (6 stores)               |
|              | Socket.IO Client                       | 4.x     | Real-time updates                         |
|              | @dnd-kit                               | 6.x     | Drag-and-drop storyboard                  |
| **Backend**  | NestJS                                 | 10.x    | Node.js framework                         |
|              | TypeScript                             | 5.x     | Type safety                               |
|              | TypeORM                                | 0.3.x   | ORM / database                            |
|              | PostgreSQL                             | 14+     | Primary database                          |
|              | pgvector                               | -       | Vector similarity search                  |
|              | Redis                                  | 7+      | Cache / Queue / PubSub                    |
|              | BullMQ                                 | 5.x     | Task queue (5 queues, dual-mode)          |
|              | Socket.IO                              | 4.x     | WebSocket                                 |
|              | LangChain / LangGraph                  | 1.x     | Agent orchestration                       |
|              | FFmpeg                                 | 5+      | Media processing (spawn-based)            |
| **AI**       | Volcengine ARK Doubao-Seed-2.0-pro     | -       | Text generation / Vision analysis         |
|              | Volcengine ARK Doubao-Seedance-1.5-pro | -       | Video generation                          |
|              | BGE-M3 (Ollama, optional)              | -       | Text embedding                            |
| **DevOps**   | pnpm                                   | 8+      | Package manager                           |
|              | Railway                                | -       | Backend hosting                           |
|              | Vercel                                 | -       | Frontend hosting                          |
|              | ESLint / Prettier / StyleLint          | -       | Code quality                              |

---

## 4. Module Design

### 4.1 Material Module

**Purpose**: Provide a structured asset library for AIGC video generation, handling ingestion, analysis, and retrieval of visual/audio assets.

**Core Entities**:

- `Material`: Image, video, or audio asset with metadata and three-layer tags
  - `productTags`: Product-level (name, category, brand, colors, material)
  - `videoTags`: Video-level (summary, scene, shot, composition, lighting, style, mood)
  - `clipTags`: Clip-level (objects, text, mood, suitableFor)
  - `embedding`: pgvector 1024-dim vector for semantic similarity search (`select: false`)

**Upload Pipeline**:

```
User file → Multer FileInterceptor → diskStorage (randomUUID filename)
  → MIME filter (image/jpeg|png|webp, video/mp4, audio/mpeg|mp3)
  → 200MB file size limit
  → Create Material entity (url: /static/uploads/<uuid>.<ext>)
  → Auto-enqueue analyze job (queue or inline fallback)
  → Return Material
```

- Files stored on disk under `storage/uploads/`
- URL prefix: `/static/uploads/` → served by NestJS static assets middleware
- Production target: migrate to object storage (Aliyun OSS / Volcengine TOS)

**Analysis Pipeline**:

_Image analysis_:

```
Material URL → ArKVisionService.understandImage()
  → ARK Doubao-Seed-2.0-pro multimodal vision
  → Parse structured JSON (productTags + videoTags + clipTags + caption)
  → Persist to material row
  → Fallback: heuristic product/video/clip tags
```

_Video analysis_:

```
Material URL → downloadFile() (supports data:/http/https/local)
  → FfmpegService.extractKeyframes(3 frames)
  → Per-frame: ARK vision (via data URL)
  → Aggregate results with Set dedup (categories, colors, scenes, moods, objects)
  → Generate three-layer tags
  → Cleanup temp files
  → Fallback: heuristic tags on failure
```

**Retrieval System**:

- **Keyword search**: PostgreSQL `LIKE` on name/tags
- **Tag filtering**: Three-layer tag filter (productCategory, videoMood, clipObjects)
- **Vector similarity**: pgvector `<=>` cosine similarity (requires extension)
- **Sorting**: 6 dimensions — `createdAt ASC/DESC`, `name ASC/DESC`, `size ASC/DESC`
- **Fallback chain**: vector → ILIKE → empty results

**API Endpoints**:

| Method | Path                            | Description                                      | New in v2.3                        |
| ------ | ------------------------------- | ------------------------------------------------ | ---------------------------------- |
| GET    | `/api/material`                 | List materials (paginated, sortable, filterable) | `orderBy`, `orderDirection` params |
| POST   | `/api/material`                 | Create material record (JSON)                    | —                                  |
| POST   | `/api/material/upload`          | Upload file (multipart)                          | ✅ New in v2.2                     |
| GET    | `/api/material/:id`             | Get material detail                              | —                                  |
| DELETE | `/api/material/:id`             | Delete material                                  | —                                  |
| PATCH  | `/api/material/:id/analyze`     | Trigger AI tag analysis                          | —                                  |
| GET    | `/api/material/search/tags`     | Tag-based search (product/video/clip)            | —                                  |
| POST   | `/api/material/semantic-search` | Vector similarity search                         | —                                  |

**Queue Integration**:

- Queue name: `material-analyze`
- Processor: `MaterialAnalyzeProcessor` (via `ModuleRef` lazy resolution to avoid circular deps)
- Auto-enqueue after upload; local development may fall back to inline execution when Redis is unavailable
- Staging and production require `REDIS_URL`, unless `QUEUE_INLINE_FALLBACK=true` is explicitly set as an emergency override
- BullMQ retry policy: 3 attempts with exponential backoff

---

### 4.2 Script Module

**Purpose**: Automate the production of e-commerce video scripts using trending video references, product information, and configurable creative templates.

**Core Entities**:

- `Script`: Generated video script with narrative framework and storyboard
  - `shots[]`: Array of shot objects with description, voiceover, camera movement, duration, BGM, subtitles
  - `voiceover`: TTS voiceover configuration
  - `bgmSuggestion`: Background music recommendation
  - `compliance`: Compliance check results
  - `ragReferences`: Trending video references used

**Key Flows**:

1. **Script Generation** (`POST /api/script/generate`):
   - Receives: product name, category, selling points, target audience, style, duration
   - RAG enhancement: searches seed hit scripts by category + style → injects top-2 matches as few-shot examples
   - Product space knowledge injection: selling points, target audience, brand voice, best practices
   - Prompt construction with JSON Schema enforcement
   - Calls ARK Doubao-Seed-2.0-pro → parses structured JSON → normalizes
   - Compliance scan (dictionary-based: advertising law, medical terms, exaggeration)
   - Fallback: template-based script generation
2. **Trending Video Inspiration** (`GET /api/script/inspire`):
   - Returns curated hit scripts with style, category, hook analysis, engagement metrics
   - Frontend "Trend Library" drawer visualizes results with per-shot preview
3. **Agent-Driven Script Generation**: Via LangGraph pipeline (see Agent Orchestration)

**Script Generation Prompt Architecture**:

```
System: You are an e-commerce video script expert.
  - Rules: output strict JSON, avoid forbidden words, 3 shots max (hook/demo/cta)
  - Structured output schema: { title, shots[], voiceover, bgmSuggestion, tags }

User: { productName, category, sellingPoints, targetAudience, style, duration }

Few-Shot: Top-2 matched hit scripts from seed database (same category + style)
Knowledge: Product space selling points, brand voice, best practices
```

---

### 4.3 Creation Module

**Purpose**: Transform scripts and materials into complete videos with real-time progress tracking and shot-level editing.

**Core Entities**:

- `CreationTask`: Video generation task with status lifecycle
  - Status: `PENDING → PROCESSING → GENERATING_ASSETS → RENDERING → SUCCESS/FAILED`
  - Shots: Individual video segments with generation state
  - Progress: Overall and per-shot progress percentages

**Key Flows**:

1. **Manual Creation**: User inputs prompt → system generates storyboard via LLM → user edits shots → "Start Generation" triggers video pipeline
2. **AI One-Click**: Agent pipeline (material_analysis → script_generation → video_composition → quality_control)
3. **Shot-Level Intervention**:
   - Regenerate single shot via ARK video API
   - Replace reference material via `MaterialSelector`
   - Adjust duration (1-30s slider)
   - Edit voiceover/dialogue text
   - Add/delete/duplicate/reorder shots via drag-and-drop (@dnd-kit)
4. **Video Composition** (`ComposerService`):
   - Step 1: Download generated video segments
   - Step 2: FFmpeg concat (scene拼接)
   - Step 3: TTS voiceover synthesis (Volcengine OpenSpeech / silence fallback)
   - Step 4: BGM selection by style (local mp3 files)
   - Step 5: Audio mixing (voiceover + BGM, BGM volume 18%)
   - Step 6: Subtitle generation (SRT) and burning
   - Step 7: Publish to storage outputs

**Real-Time Progress**:

- WebSocket (Socket.IO, `/creation` namespace): events for `progress`, `shot-progress`, `complete`, `error`
- REST polling fallback: 5-second interval fallback
- Per-shot status tracking with detailed progress messages

**Export Capabilities**:

| Format     | Resolution               | Aspect Ratio    | Channel      |
| ---------- | ------------------------ | --------------- | ------------ |
| MP4 H.264  | 480p / 720p / 1080p / 4K | 9:16, 16:9, 1:1 | All          |
| MOV ProRes | 1080p                    | 9:16, 16:9      | Professional |
| WebM       | 720p                     | 16:9            | Web          |
| GIF        | 480p                     | 9:16            | Social       |

**Error Handling**:

- Single shot failure → other shots continue; failed shot falls back to first successful shot
- Compose failure → falls back to first generated shot URL
- Subtitle burn failure → returns un-subtitled video
- Auto-retry with exponential backoff for transient ARK API errors

---

### 4.4 Agent Orchestration

**Purpose**: Orchestrate multi-step AI workflows with feedback loops, self-reflection, and continuous learning.

**Framework**: LangGraph (`@langchain/langgraph`) `StateGraph`

**Pipeline**:

```
User Input → Orchestrator → Material Analysis → Script Generation → Video Composition → Quality Check
                                ↑                    |                    |                  |
                                └────────────────────┘────────────────────┘──────────────────┘
                                                      |
                                           If quality < threshold AND retryCount < 2
                                                      |
                                                      ▼
                                              Re-run Composition
                                              (with quality feedback, retryCount++)
```

**Agent Services**:

1. **MaterialAgent** (`material-agent.service.ts`):
   - Queries material database by productSpaceId
   - Scores relevance by category match + keyword overlap
   - Binds matched materials to storyboard shots
   - Falls back to text-to-video path if no materials found

2. **ScriptAgent** (`script-agent.service.ts`):
   - Generates script via `ScriptService.generate()` with ARK
   - Binds material analysis results to individual shots
   - Self-reflection: injects quality control feedback into next iteration

3. **CompositionAgent** (`composition-agent.service.ts`):
   - Generates videos for each shot via ARK Seedance
   - Rate-limited: max 3 concurrent shot generations
   - Polls ARK task status (up to 8-minute timeout)
   - FFmpeg composition via `ComposerService`
   - **Retry safety**: `retryCount` correctly incremented each iteration (fixed in v2.2)

4. **QualityAgent** (`quality-agent.service.ts`):
   - Multi-dimension scoring: completeness (30%), duration (15%), consistency (20%), compliance (20%), hook strength (15%)
   - LLM-driven consistency/hook scoring via ARK text model
   - Dictionary-based compliance check (hundreds of forbidden patterns in 5 categories)
   - Generates structured feedback for self-reflection loop

**Self-Learning Flywheel** (`orchestrator.service.ts`):

- High-quality results (score >= 85) are persisted to `ProductSpace.knowledge.bestPractices`
- Subsequent generations inject these as few-shot examples
- Feedback loop creates a continuously improving system

**Trace System**:

- Every agent pushes structured trace entries: `{ span, startedAt, endedAt, latencyMs, status, summary, errorMessage }`
- Traces stored in `trace_spans` table for post-hoc analysis
- Exposed via `/api/analytics/traces` endpoint

---

### 4.5 Analytics Module

**Purpose**: Provide actionable insights into production metrics, agent performance, and cost tracking.

**Available Endpoints**:

| Method | Path                                                | Description                                                                              |
| ------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| GET    | `/api/analytics/overview`                           | Summary cards (totals, trends, MoM changes)                                              |
| GET    | `/api/analytics/trends`                             | Time-series production data (7/30/90 days)                                               |
| GET    | `/api/analytics/distribution`                       | Category/style distribution                                                              |
| GET    | `/api/analytics/queue`                              | BullMQ queue status (depth, throughput)                                                  |
| GET    | `/api/analytics/attribution`                        | Factor attribution analysis (style × status heatmap)                                     |
| GET    | `/api/analytics/traces`                             | Agent execution traces (waterfall)                                                       |
| GET    | `/api/analytics/cost`                               | AI cost overview (tokens, cache hit rate, latency)                                       |
| GET    | `/api/agent/runs/:taskId/audit`                     | Owner-scoped Agent control plane, checkpoint summaries and sanitized Provider operations |
| GET    | `/api/agent/runs/:taskId/checkpoints/:checkpointId` | Redacted checkpoint state inspection                                                     |
| POST   | `/api/agent/runs/:taskId/resume`                    | Resume an opt-in human review interrupt                                                  |
| POST   | `/api/agent/runs/:taskId/replay`                    | Resume the latest checkpoint on the same thread                                          |
| POST   | `/api/agent/runs/:taskId/fork`                      | Create an isolated child run from a checkpoint                                           |

All endpoints return empty fallbacks on failure (soft-fail pattern).
AnalyticsService injects `QueueRunnerService` and `TraceService` — both from `@Global()` modules.

---

### 4.6 Export Module

**Purpose**: Handle video export with format transcoding and delivery.

**Key Flows**:

1. Export task creation → download source → FFmpeg transcode → publish → completion notification
2. Supports per-shot individual download
3. Multiple export formats and resolutions (see Creation Module)

**Tracking**: ExportTask entity with status, progress, and completion tracking.

---

## 5. AI Integration

### Volcengine ARK API

| Model                   | Type          | Endpoint ID               | Rate Limit      | Usage                                                                |
| ----------------------- | ------------- | ------------------------- | --------------- | -------------------------------------------------------------------- |
| Doubao-Seed-2.0-pro     | Text / Vision | `ep-20260514115629-vhldw` | 100RPM / 50WTPM | Script generation, vision analysis, quality scoring, agent reasoning |
| Doubao-Seedance-1.5-pro | Video         | `ep-20260514120705-pqv86` | 5 concurrent    | Video shot generation                                                |

### API Configuration

The ARK configuration system supports three-tier key resolution:

1. **Environment variables** (highest priority): `ARK_TEXT_PRIMARY_API_KEY`, `ARK_VIDEO_PRIMARY_API_KEY`
2. **Built-in defaults**: Hardcoded in `ark.config.ts` for local development
3. **Credential isolation**: API credentials are injected through environment variables or deployment secrets and are never committed to the repository.

### Integration Points

| Service            | AI Model                         | Function                                            |
| ------------------ | -------------------------------- | --------------------------------------------------- |
| `ArkTextService`   | Doubao-Seed-2.0-pro              | Chat completion for script generation               |
| `ArkVisionService` | Doubao-Seed-2.0-pro (multimodal) | Image/video keyframe understanding + tag generation |
| `ArkVideoService`  | Doubao-Seedance-1.5-pro          | Video shot generation + async task polling          |
| `QualityAgent`     | Doubao-Seed-2.0-pro              | Consistency/hook score evaluation                   |
| `ScriptAgent`      | Doubao-Seed-2.0-pro              | Script generation with ARK + self-reflection        |
| `BgmService`       | Local file selection             | BGM selection by style (8 categories)               |
| `TtsService`       | Volcengine OpenSpeech / FFmpeg   | Voiceover synthesis (silence fallback)              |
| Embedding          | BGE-M3 (Ollama, optional)        | Material vector embeddings for pgvector             |

### AI Prompt Strategy

- **Script Generation**: System prompt defines role (e-commerce video script expert), output schema (strict JSON), constraints (forbidden words, 3-shot structure). User prompt contains product info. RAG few-shot examples from seed database. Product space knowledge enrichment.
- **Vision Analysis**: Structured JSON output enforced with three-layer taxonomy. Enum-constrained categories (8 product categories, 6 moods, 5 styles, 5 suitability types).
- **Quality Evaluation**: Multi-dimension scoring with LLM evaluation on consistency and hook strength + deterministic dictionary checks on compliance (5 categories, 200+ patterns).
- **Agent self-reflection**: Quality feedback injected into next composition iteration's prompt as context.

---

## 6. Frontend Architecture

### Routing

```
/                           → Redirect to /workspace (or /auth)
/auth                       → Login / Register
/workspace                  → Workspace list / selection
/workspace/:spaceId/material  → Material management
/workspace/:spaceId/script    → Script generation
/workspace/:spaceId/video     → Video creation (storyboard editor)
/workspace/:spaceId/data      → Analytics dashboard
/workspace/:spaceId/ab        → A/B comparison
/profile                     → User profile
```

### State Management (Zustand)

| Store                   | Purpose                             | Persistence          |
| ----------------------- | ----------------------------------- | -------------------- |
| `useAuthStore`          | Auth token, user info, login/logout | `localStorage`       |
| `useAppStore`           | Sidebar collapse, global loading    | Session              |
| `useSpaceStore`         | Active workspace, workspace list    | `localStorage`       |
| `useStoryboardStore`    | Shot CRUD, reorder, selection       | Memory (client-only) |
| `useScriptHandoffStore` | Cross-page script transfer          | Memory               |
| `useNotificationStore`  | Notifications with polling          | Memory               |

### Key UX Features

- **Responsive Layout**: Desktop-first with mobile-ready components (MobileShell, BottomTabBar, SwipeableView)
- **Dark/Light Theme**: CSS variable-based theming with `useTheme` hook + `ThemeToggle` component
- **Glassmorphism Design**: 6 glass variants (`glass`, `glass-strong`, `glass-card`, `glass-card-accent`, `glass-gradient`, `glass-accent-left`, `glass-border-gradient`)
- **Animation System**: 12 animation classes (pageEnter, fadeIn, slideUp, slideDown, scaleIn, pulse, shimmer, countUp, stagger, progressPulse, spin, fabEnter)
- **Ant Design Theme Adaptation**: Full dark/light theme support for Segmented, Modal, Drawer, Dropdown, Steps, Skeleton, Tags
- **Keyboard Shortcuts**: `Cmd+S` save, `Ctrl+Shift+P` preview, `Cmd+D` duplicate shot, via `useKeyboardShortcuts` hook
- **Real-Time Progress**: WebSocket-driven task progress with per-shot status
- **Error Boundaries**: Every route and major component wrapped with retry-capable error boundary
- **Empty States**: Reusable `EmptyState` component with icon, title, description, action button
- **Loading States**: Skeleton loading (grid cards), spin overlay, per-operation loading indicators
- **Unified Empty State Component**: `EmptyState` in `components/common/` with consistent icon circle, title, description, and CTA button

### Material Page Features (v2.3)

- **Search**: Real-time keyword search on name/tags with debounced enter
- **Type Filter**: Segmented control (All / Image / Video / Audio)
- **Tag Filters**: Category, mood, style chip filters extracted from three-layer AI tags
- **Sort**: 6 dimensions (newest, oldest, name A-Z, name Z-A, size desc, size asc)
- **View Mode**: Grid (responsive columns) / List toggle
- **Upload**: Drag-and-drop zone + button trigger, multipart/form-data, 200MB limit
- **AI Status**: Visual indicators ("已分析" badge / "待分析" tag) per card
- **Analysis**: Per-material "analyze" button with loading state, caption feedback
- **Preview Modal**: Full media preview + metadata + three-layer tag display
- **Empty State**: Contextual empty state with upload CTA
- **Loading State**: 8 skeleton cards while fetching

### Script Page Features (v2.3)

- **Trend Library Drawer**: Right-side drawer showing top-K hit scripts filtered by current category + style
- **Seed Card Design**: Per-card display of HOOK/DEMO/CTA shot previews, key messages, BGM style, performance tag
- **Refresh**: One-click reload after changing category/style

### Data Visualization (ECharts)

| Chart            | Widget                           | Data Source                                      |
| ---------------- | -------------------------------- | ------------------------------------------------ |
| Line/Bar/Area    | TrendChart                       | `/api/analytics/trends`                          |
| Nightingale Rose | DistributionChart                | `/api/analytics/distribution`                    |
| Radar            | ModelComparisonChart             | `/api/analytics/distribution`                    |
| Stacked Bar      | ModelCategoryChart               | `/api/analytics/attribution`                     |
| Heatmap          | FactorAttributionChart           | `/api/analytics/attribution`                     |
| Waterfall        | TraceTimeline                    | `/api/analytics/traces`                          |
| Progress Bar     | QueueStatus                      | `/api/analytics/queue`                           |
| Stat Cards       | OverviewCards + CostOverviewCard | `/api/analytics/overview`, `/api/analytics/cost` |

---

## 7. Data Storage

### PostgreSQL (Primary Database)

**Key Entities**:

| Entity            | Table                 | Key Fields                                                                                                                              |
| ----------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| User              | `users`               | email, password, avatar, role                                                                                                           |
| ProductSpace      | `product_spaces`      | name, category, knowledge (JSONB)                                                                                                       |
| Material          | `materials`           | type, url, tags (JSONB), productTags (JSONB), videoTags (JSONB), clipTags (JSONB), embedding (vector(1024), optional), metadata (JSONB) |
| Script            | `scripts`             | title, content (JSONB shots), voiceover, bgmSuggestion, tags, compliance, duration                                                      |
| CreationTask      | `creation_tasks`      | status, progress, storyboard (JSONB), result (JSONB), agentTrace                                                                        |
| ExportTask        | `export_tasks`        | format, resolution, status, progress, result (JSONB)                                                                                    |
| TraceSpan         | `trace_spans`         | span, taskId, startedAt, endedAt, latencyMs, status, summary, errorMessage                                                              |
| ProviderOperation | `provider_operations` | user/run owner, node, provider, stable idempotency key, request hash, remote task ID, attempt, status and sanitized outcome             |

**Vector Search**: pgvector extension enables cosine similarity search via `<=>` operator on `embedding` column. Requires manual extension setup:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS "embedding" vector(1024);
```

### Redis

- **BullMQ Queues**: 5 queues (creation-shot, creation-compose, export-encode, material-analyze, agent-run) with delayed retry; `agent-run` is consumed by the independent Agent Worker
- **LangGraph Checkpoints**: `PostgresSaver` stores graph super-steps in PostgreSQL. A stable `thread_id` allows a requeued worker to resume from the unfinished node.
- **Provider Operations**: `provider_operations` stores the external video-operation lifecycle independently from graph state. It links a run to a remote task ID without storing credentials or raw prompts.
- **Transactional Agent Dispatch**: `agent_outbox_events` records the BullMQ dispatch intent in the same transaction as `agent_runs`; a dispatcher retries delivery with a stable job identity and stale-lock recovery.
- **Cache**: Hot data caching (material lists, dashboard aggregation)
- **Session**: WebSocket session mapping for real-time progress
- **Pub/Sub**: Cross-instance event broadcasting

### File Storage

- **Current**: multer disk storage at `storage/uploads/`, served via `/static/` prefix
- **Output Videos**: `storage/outputs/creation/<taskId>.mp4`
- **Artifact integrity**: published outputs include a SHA-256 checksum in the creation result and the corresponding `video_composition` trace metadata.
- **Temp Files**: `storage/tmp/` (auto-cleaned after video analysis)
- **BGM Files**: `storage/bgm/` (style-prefixed mp3 files)
- **Production Target**: Object storage (Aliyun OSS / Volcengine TOS) for scalability

---

## 8. Deployment Architecture

### Production Topology

```
┌──────────────────────────────────────────────────────────┐
│                     Vercel (CDN)                          │
│  React SPA static assets, edge-serving, auto-SSL         │
│  Domain: https://vid-forge-frontend-nu.vercel.app        │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│                 Railway (Backend + DB)                    │
│  NestJS API server                                       │
│  PostgreSQL 14 | Redis 7 | FFmpeg 5+                     │
│  Health check: /api/health                               │
│  Domain: https://vid-forge-backend.up.railway.app        │
└──────────────────────────────────────────────────────────┘
```

### Environment Variables

| Variable                        | Required                                                 | Purpose               |
| ------------------------------- | -------------------------------------------------------- | --------------------- |
| `DATABASE_URL`                  | Yes                                                      | PostgreSQL connection |
| `REDIS_URL`                     | Yes in staging/production; local development may omit it | Queue/cache           |
| `JWT_SECRET`                    | Yes                                                      | Auth signing          |
| `ARK_TEXT_PRIMARY_ENDPOINT_ID`  | No (has builtin)                                         | Text model endpoint   |
| `ARK_TEXT_PRIMARY_API_KEY`      | No (has builtin)                                         | Text model API key    |
| `ARK_VIDEO_PRIMARY_ENDPOINT_ID` | No (has builtin)                                         | Video model endpoint  |
| `ARK_VIDEO_PRIMARY_API_KEY`     | No (has builtin)                                         | Video model API key   |
| `WEB_BASE_URL`                  | Yes                                                      | CORS allowed origin   |
| `NODE_ENV`                      | Yes                                                      | Environment flag      |

### Graceful Degradation

The system auto-detects missing dependencies and degrades gracefully:

- **No Redis**: local development can use in-process task execution; staging/production reject queue-backed work by default
- **No ARK API key**: Script generation returns template-based fallback; material analysis returns heuristic tags
- **No pgvector**: Vector search falls back to `ILIKE` text search
- **No TTS**: Falls back to silent placeholder audio (ffmpeg anullsrc)
- **No BGM files**: Video generated without background music

---

## 9. Security & Compliance

### Authentication

- JWT-based auth with bcrypt password hashing
- Route guards (`RequireAuth`, `JwtAuthGuard`) on all protected routes
- Token stored in `localStorage` with auto-refresh on 401 redirect

### Authorization

- ProductSpace-level isolation: all data queries filtered by `productSpaceId`
- User-scoped analytics: metrics calculated per authenticated user
- Material ownership enforcement: `findOne` validates `material.userId === userId`

### Compliance System (`ComplianceService`)

- Dictionary-based content screening covering 5 categories:
  - Advertising law prohibited terms (绝对化用语, 极限词)
  - Medical claim violations (医疗保健功效)
  - Exaggerated marketing language (夸大用语)
  - Platform-specific policy rules (TikTok/抖音电商)
  - Custom merchant blacklist (商家自定义词库)
- Runs against every generated script
- Returns structured compliance report with `passed`, `hits[]`, `llmReviewed`, `llmFeedback`
- Scoring: compliance score contributes 20% to Agent quality evaluation

### API Security

- CORS whitelist (configurable via `WEB_BASE_URL`, supports `*.vercel.app` wildcard)
- Swagger docs behind JWT auth in production
- Input validation via `class-validator` on all DTOs
- Parameterized queries / TypeORM prevents SQL injection
- File upload: 200MB size limit + MIME whitelist + sanitized filenames (UUID)
- Rate limiting: 30 req/10s short burst + 100 req/60s sustained (ThrottlerGuard)

### Privacy

- `PrivacyConsent` first-use dialog (analytics, drafts, logging toggles)
- `PrivacySettings` panel: data retention, export, local data clearing
- Configurable consent options stored in localStorage

---

## 10. CI/CD & Quality Assurance

### Code Quality Tooling

| Tool        | Purpose                  | Configuration                                         |
| ----------- | ------------------------ | ----------------------------------------------------- |
| ESLint      | TypeScript/React linting | `.eslintrc.cjs` — recommended configs                 |
| Prettier    | Code formatting          | `.prettierrc` — single quotes, 100 print width        |
| StyleLint   | CSS/Less linting         | `.stylelintrc.cjs` — standard config                  |
| Husky       | Git hooks                | Configured in `package.json` (pre-commit lint-staged) |
| Lint-staged | Stage-specific linting   | TS/TSX → ESLint + Prettier, CSS → StyleLint           |

### CI Pipeline Status

- [x] **Railway.json**: Build/deploy configuration for backend
- [ ] **GitHub Actions**: CI pipeline not yet configured (pending)
- [ ] **Husky initialization**: `.husky/` directory not yet created (pending)

### Build Configuration

- **Frontend**: Vite build → static files → Vercel deployment (auto-detected)
- **Backend**: NestJS build → Node.js server → Railway deployment (Nixpacks auto-detected)
- **Root**: Monorepo managed with pnpm workspaces

---

## 11. Observability

### Logging

- NestJS Logger across all services with structured context identifiers
- ARK API call logging with timing, model, and error capture
- Queue job lifecycle logging (enqueue, start, complete, fail)

### Task Tracing

- Agent trace spans with timing: `{ span, startedAt, endedAt, latencyMs, status, summary }`
- Trace storage in `trace_spans` table for waterfall analysis
- Trace query API for performance analysis and cost attribution

### Health Check

- `GET /api/health`: Returns server status (ok), timestamp (ISO), and uptime (seconds)
- Railway uses this for automatic health monitoring and restart

### ARK Diagnostics

- `GET /api/ai/ark/diagnose`: Pings all ARK endpoints with current credentials
- Returns per-model status: endpoint, key source, connectivity, latency, sample response
- Key fingerprinting: checks length, masking, known issues (whitespace, quotes)
- Frontend diagnostics panel for user-side troubleshooting

### Queue Monitoring

- BullMQ queue metrics: depth, active workers, waiting tasks, average wait time, throughput
- Frontend `QueueStatus` component with 10-second polling
- Cost overview: total calls, tokens, cost cents, cache hit rate, avg latency

### Cost Tracking

- Real-time AI cost aggregation in `TraceService.overview()`
- Dashboard `CostOverviewCard` with 30-second polling
- Metrics: total API calls, total tokens consumed, estimated cost (cents), cache hit rate, average latency (ms)

---

> **Document Version**: 2.2
> **Last Updated**: 2026-06-06
> **Primary Language**: English (technical reference)
> **Consolidated from**: 架构说明.md, 部署文档.md, 生产部署方案.md, project audit findings, P0/P1 implementation

### Changelog

| Version | Date       | Changes                                                                                |
| ------- | ---------- | -------------------------------------------------------------------------------------- |
| 2.0     | 2026-06-06 | Initial consolidation from multiple docs                                               |
| 2.2     | 2026-06-06 | Updated for P0 fixes: multer upload, video analysis, embedding column, retryCount fix  |
| 2.2+    | 2026-06-06 | Updated for P1: sorting, tag filters, queue processor, trend library, UI design system |
