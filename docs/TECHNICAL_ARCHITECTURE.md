# VidForge Technical Architecture

> **Version**: 2.0 | **Last Updated**: 2026-06-06
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
- Multi-type material management with AI-powered tagging and retrieval
- Intelligent script generation with RAG-enhanced trending video references
- One-click video creation with shot-level intervention
- AI Agent orchestration for fully automated production pipeline
- Real-time task progress via WebSocket
- Multi-format export with resolution and aspect ratio options
- A/B comparison for video performance optimization
- Data dashboard for production analytics

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
│  │  Shared Components: StoryboardEditor, VideoPlayer, Charts   │   │
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
│  │  AI Services: ARK Text, ARK Video, TTS, BGM, FFmpeg         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Agent Orchestrator (LangGraph StateGraph)                   │   │
│  │  MaterialAgent → ScriptAgent → CompositionAgent → Quality   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   PostgreSQL     │ │      Redis       │ │  File Storage    │
│  + pgvector      │ │  (BullMQ Queue)  │ │  (Local Disk)    │
│  (Entities +     │ │  (Cache/Session) │ │  (OSS ready)     │
│   Vector Search) │ │  (WS Pub/Sub)    │ │                  │
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
- **Async Processing**: Long-running tasks (video generation, rendering) use BullMQ queue with progress reporting
- **Agent-Driven Pipeline**: LangGraph orchestrates multi-step AI workflows with self-reflection and feedback loops

---

## 3. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.x | UI framework |
| | TypeScript | 5.x | Type safety |
| | Vite | 5.x | Build tool / HMR |
| | Ant Design | 5.x | Component library |
| | ECharts | 5.x | Data visualization |
| | Zustand | 4.x | State management |
| | Socket.IO Client | 4.x | Real-time updates |
| | @dnd-kit | 6.x | Drag-and-drop |
| **Backend** | NestJS | 10.x | Node.js framework |
| | TypeScript | 5.x | Type safety |
| | TypeORM | 0.3.x | ORM / database |
| | PostgreSQL | 14+ | Primary database |
| | pgvector | - | Vector similarity search |
| | Redis | 7+ | Cache / Queue / PubSub |
| | BullMQ | 5.x | Task queue |
| | Socket.IO | 4.x | WebSocket |
| | LangChain / LangGraph | 1.x | Agent orchestration |
| | FFmpeg | 5+ | Media processing |
| **AI** | Volcengine ARK Doubao-Seed-2.0-pro | - | Text generation / Vision |
| | Volcengine ARK Doubao-Seedance-1.5-pro | - | Video generation |
| | BGE-M3 (Ollama, optional) | - | Text embedding |
| **DevOps** | pnpm | 8+ | Package manager |
| | Railway | - | Backend hosting |
| | Vercel | - | Frontend hosting |
| | ESLint / Prettier / StyleLint | - | Code quality |

---

## 4. Module Design

### 4.1 Material Module

**Purpose**: Provide a structured asset library for AIGC video generation, handling ingestion, analysis, and retrieval of visual/audio assets.

**Core Entities**:
- `Material`: Image, video, or audio asset with metadata and three-layer tags
  - `productTags`: Product-level (name, category, brand, colors, material)
  - `videoTags`: Video-level (summary, scene, shot, composition, lighting, style, mood)
  - `clipTags`: Clip-level (objects, text, mood, suitableFor)

**Key Flows**:
1. **Upload**: User uploads files via drag-and-drop or file picker → stored as base64 data URL (current) / OSS (planned) → database record created
2. **Analysis**: AI-driven vision analysis (`ArkVisionService.understandImage`) auto-generates structured tags with three-layer taxonomy
3. **Retrieval**:
   - Keyword search via PostgreSQL `ILIKE` on name/tags
   - Tag-based filtering on product/video/clip dimensions
   - Vector similarity search via pgvector `<=>` operator (requires manual extension setup)
4. **Material Selection**: Storyboard editor integrates `MaterialSelector` to bind assets to individual shots

**Fallback Behavior**:
- Image analysis calls ARK Doubao-Seed-2.0-pro with multimodal vision → if ARK fails, heuristic tags are used
- Vector search falls back to `ILIKE` search if pgvector is unavailable
- Video/audio assets use heuristic tag generation (keyframe extraction + per-frame analysis planned)

**API Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/material` | List materials (paginated, filterable) |
| POST | `/api/material` | Create material record |
| GET | `/api/material/:id` | Get material detail |
| PATCH | `/api/material/:id` | Update material |
| DELETE | `/api/material/:id` | Delete material |
| POST | `/api/material/:id/analyze` | Trigger AI tag analysis |
| GET | `/api/material/search/tags` | Tag-based search (product/video/clip) |
| POST | `/api/material/semantic-search` | Vector similarity search |

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

**Production Modes**:
- **Standard**: Direct generation with RAG reference injection
- **Agent Pipeline**: Full orchestration with material analysis → quality feedback loop → self-reflection

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
   - Add/delete/duplicate/reorder shots via drag-and-drop
4. **Video Composition** (`ComposerService`):
   - Step 1: Download generated video segments
   - Step 2: FFmpeg concat (scene拼接)
   - Step 3: TTS voiceover synthesis
   - Step 4: BGM selection and mixing
   - Step 5: Audio mixing (voiceover + BGM)
   - Step 6: Subtitle generation (SRT) and burning
   - Step 7: Upload to storage

**Real-Time Progress**:
- WebSocket (Socket.IO, `/creation` namespace): events for `progress`, `shot-progress`, `complete`, `error`
- REST polling fallback: 5-second interval fallback
- Per-shot status tracking with detailed progress messages

**Export Capabilities**:
| Format | Resolution | Aspect Ratio | Channel |
|--------|-----------|--------------|---------|
| MP4 H.264 | 480p / 720p / 1080p / 4K | 9:16, 16:9, 1:1 | All |
| MOV ProRes | 1080p | 9:16, 16:9 | Professional |
| WebM | 720p | 16:9 | Web |
| GIF | 480p | 9:16 | Social |

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
                                              (with quality feedback)
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

4. **QualityAgent** (`quality-agent.service.ts`):
   - Multi-dimension scoring: completeness, duration, consistency, compliance, hook strength
   - LLM-driven consistency/hook scoring via ARK text model
   - Dictionary-based compliance check (hundreds of forbidden patterns)
   - Generates structured feedback for self-reflection loop

**Self-Learning Flywheel** (`orchestrator.service.ts`):
- High-quality results (score >= 85) are persisted to `ProductSpace.knowledge.bestPractices`
- Subsequent generations inject these as few-shot examples
- Feedback loop creates a continuously improving system

**Trace System**:
- Every agent pushes structured trace entries: `{ span, startedAt, endedAt, latencyMs, status, summary, errorMessage }`
- Traces are stored in `trace_spans` table for post-hoc analysis
- Exposed via `/api/analytics/traces` endpoint

---

### 4.5 Analytics Module

**Purpose**: Provide actionable insights into production metrics, agent performance, and cost tracking.

**Available Endpoints**:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/overview` | Summary cards (totals, trends) |
| GET | `/api/analytics/trends` | Time-series production data |
| GET | `/api/analytics/distribution` | Category/style distribution |
| GET | `/api/analytics/queue` | BullMQ queue status |
| GET | `/api/analytics/attribution` | Factor attribution analysis |
| GET | `/api/analytics/traces` | Agent execution traces |
| GET | `/api/analytics/cost` | AI cost overview |

All endpoints return empty fallbacks on failure (soft-fail pattern).

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

| Model | Type | Endpoint ID | Rate Limit | Usage |
|-------|------|-------------|------------|-------|
| Doubao-Seed-2.0-pro | Text / Vision | `ep-20260514115629-vhldw` | 100RPM / 50WTPM | Script generation, vision analysis, quality scoring, agent reasoning |
| Doubao-Seedance-1.5-pro | Video | `ep-20260514120705-pqv86` | 5 concurrent | Video shot generation |

### API Configuration

The ARK configuration system supports three-tier key resolution:
1. **Environment variables** (highest priority): `ARK_TEXT_PRIMARY_API_KEY`, `ARK_VIDEO_PRIMARY_API_KEY`
2. **Built-in defaults**: Hardcoded in `ark.config.ts` for local development
3. **Dead key blacklist**: Known invalid keys auto-skip to fallback

### Integration Points

| Service | AI Model | Function |
|---------|----------|----------|
| `ArkTextService` | Doubao-Seed-2.0-pro | Chat completion for script generation |
| `ArkVisionService` | Doubao-Seed-2.0-pro (multimodal) | Image understanding + tag generation |
| `ArkVideoService` | Doubao-Seedance-1.5-pro | Video shot generation + task polling |
| `QualityAgent` | Doubao-Seed-2.0-pro | Consistency/hook score evaluation |
| `ScriptAgent` | Doubao-Seed-2.0-pro | Script generation with ARK |
| `BgmService` | Local file selection | BGM selection by style |
| `TtsService` | FFmpeg + Wav | Voiceover synthesis |
| Embedding | BGE-M3 (Ollama) | Material vector embeddings (optional) |

### AI Prompt Strategy

- **Script Generation**: System prompt defines role, output schema, constraints. User prompt contains product info. RAG few-shot examples from seed database. Product space knowledge enrichment.
- **Vision Analysis**: Structured JSON output enforced with three-layer taxonomy. Enum-constrained categories for consistency.
- **Quality Evaluation**: Multi-dimension scoring with LLM evaluation on consistency and hook strength + deterministic dictionary checks on compliance.
- **Agent self-reflection**: Quality feedback injected into next composition iteration's prompt.

---

## 6. Frontend Architecture

### Routing

```
/                           → Redirect to /workspace (or /auth)
/auth                       → Login / Register
/workspace                  → Workspace list / selection
/workspace/:spaceId/dashboard → Analytics dashboard
/workspace/:spaceId/material  → Material management
/workspace/:spaceId/script    → Script generation
/workspace/:spaceId/video     → Video creation
/workspace/:spaceId/export    → Export management
/workspace/:spaceId/ab        → A/B comparison
```

### State Management (Zustand)

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `useAuthStore` | Auth token, user info, login/logout | `localStorage` |
| `useAppStore` | Sidebar collapse, global loading | Session |
| `useSpaceStore` | Active workspace, workspace list | `localStorage` |
| `useStoryboardStore` | Shot CRUD, reorder, selection | Memory (client-only) |
| `useScriptHandoffStore` | Cross-page script transfer | Memory |
| `useNotificationStore` | Notifications with polling | Memory |

### Key UX Features

- **Responsive Layout**: Desktop-first with mobile-ready components (MobileShell, BottomTabBar, SwipeableView)
- **Dark/Light Theme**: CSS variable-based theming with `ThemeToggle`
- **Keyboard Shortcuts**: `Cmd+S` save, `Ctrl+Shift+P` preview, `Cmd+D` duplicate shot
- **Real-Time Progress**: WebSocket-driven task progress with per-shot status
- **Error Boundaries**: Every route and major component wrapped with retry-capable error boundary
- **Empty States**: All data views show contextual empty states with action prompts
- **Loading States**: Skeleton loading, spinner overlay, and per-operation loading indicators

### Data Visualization (ECharts)

| Chart | Widget | Data Source |
|-------|--------|-------------|
| Line/Bar/Area | TrendChart | `/api/analytics/trends` |
| Nightingale Rose | DistributionChart | `/api/analytics/distribution` |
| Radar | ModelComparisonChart | `/api/analytics/distribution` |
| Stacked Bar | ModelCategoryChart | `/api/analytics/attribution` |
| Heatmap | FactorAttributionChart | `/api/analytics/attribution` |
| Waterfall | TraceTimeline | `/api/analytics/traces` |
| Progress Bar | QueueStatus | `/api/analytics/queue` |
| Stat Cards | OverviewCards | `/api/analytics/overview` |

---

## 7. Data Storage

### PostgreSQL (Primary Database)

**Key Entities**:

| Entity | Table | Key Fields |
|--------|-------|------------|
| User | `users` | email, password, avatar, role |
| ProductSpace | `product_spaces` | name, category, knowledge (JSONB) |
| Material | `materials` | type, url, tags (JSONB), embedding (vector, optional) |
| Script | `scripts` | title, content (JSONB shots), version, compliance |
| CreationTask | `creation_tasks` | status, progress, shots, result, agentTrace |
| ExportTask | `export_tasks` | format, resolution, status, progress |

**Vector Search**: pgvector extension enables cosine similarity search via `<=>` operator on `embedding` column.

### Redis

- **BullMQ Queue**: Video generation task queue with delayed retry
- **Cache**: Hot data caching (material lists, dashboard aggregation)
- **Session**: WebSocket session mapping for real-time progress
- **Pub/Sub**: Cross-instance event broadcasting

### File Storage

- **Current**: Base64 data URLs stored in database (development mode)
- **Target**: Object storage (Aliyun OSS / Volcengine TOS) for production

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

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `REDIS_URL` | No (falls back to in-process) | Queue/cache |
| `JWT_SECRET` | Yes | Auth signing |
| `ARK_TEXT_PRIMARY_ENDPOINT_ID` | No (has builtin) | Text model endpoint |
| `ARK_TEXT_PRIMARY_API_KEY` | No (has builtin) | Text model API key |
| `ARK_VIDEO_PRIMARY_ENDPOINT_ID` | No (has builtin) | Video model endpoint |
| `ARK_VIDEO_PRIMARY_API_KEY` | No (has builtin) | Video model API key |
| `WEB_BASE_URL` | Yes | CORS allowed origin |
| `NODE_ENV` | Yes | Environment flag |

### Graceful Degradation

The system auto-detects missing dependencies and degrades gracefully:
- **No Redis**: BullMQ falls back to in-process task execution
- **No ARK API key**: Script generation returns template-based fallback
- **No pgvector**: Vector search falls back to `ILIKE` text search
- **No TTS**: Falls back to silent placeholder audio
- **No BGM files**: Video generated without background music

---

## 9. Security & Compliance

### Authentication
- JWT-based auth with bcrypt password hashing
- Route guards (`RequireAuth`) on all protected routes
- Token stored in `localStorage` with auto-refresh on 401

### Authorization
- ProductSpace-level isolation: all data queries filtered by `productSpaceId`
- User-scoped analytics: metrics calculated per authenticated user

### Compliance System (`ComplianceService`)
- Dictionary-based content screening covering:
  - Advertising law prohibited terms
  - Medical claim violations
  - Exaggerated marketing language
  - Platform-specific policy rules
  - Custom merchant blacklist
- Runs against every generated script
- Returns structured compliance report with:
  - `passed`: boolean
  - `issues[]`: list of violations with category, term, suggestion
  - `suggestion`: recommended replacement text

### API Security
- CORS whitelist (configurable via `WEB_BASE_URL`)
- Swagger docs behind JWT auth in production
- Input validation via `class-validator` on all DTOs
- Parameterized queries / TypeORM prevents SQL injection
- File size hints validated on frontend (200MB limit)

### Privacy
- `PrivacyConsent` first-use dialog
- `PrivacySettings` panel: data retention, export, local data clearing
- Configurable consent options (draft saving, analytics, logging)

---

## 10. CI/CD & Quality Assurance

### Code Quality Tooling

| Tool | Purpose | Configuration |
|------|---------|---------------|
| ESLint | TypeScript/React linting | `.eslintrc.cjs` — recommended configs |
| Prettier | Code formatting | `.prettierrc` — single quotes, 100 print width |
| StyleLint | CSS/Less linting | `.stylelintrc.cjs` — standard config |
| Husky | Git hooks | Configured in `package.json` (pre-commit lint-staged) |
| Lint-staged | Stage-specific linting | TS/TSX → ESLint + Prettier, CSS → StyleLint |

### CI Pipeline Status

- [x] **Railway.json**: Build/deploy configuration for backend
- [ ] **GitHub Actions**: CI pipeline not yet configured (pending)
- [ ] **Husky initialization**: `.husky/` directory not yet created (pending)

### Build Configuration

- **Frontend**: Vite build → static files → Vercel deployment
- **Backend**: NestJS build → Node.js server → Railway deployment
- **Root**: Monorepo managed with pnpm workspaces

---

## 11. Observability

### Logging
- NestJS Logger across all services
- Structured log format with context identifiers
- ARK API call logging with timing and error capture

### Task Tracing
- Agent trace spans with timing: `{ span, startedAt, endedAt, latencyMs, status, summary }`
- Trace storage in `trace_spans` table
- Trace query API for performance analysis

### Health Check
- `GET /api/health`: Returns server status, timestamp, and uptime
- Railway uses this for automatic health monitoring

### ARK Diagnostics
- `GET /api/ai/ark/diagnose`: Pings all ARK endpoints with current credentials
- Returns per-model status: endpoint, key source, connectivity, latency
- Frontend diagnostics panel for user-side troubleshooting

### Queue Monitoring
- BullMQ queue metrics: depth, active workers, waiting tasks, average wait time, throughput
- Frontend `QueueStatus` component with real-time polling
- Cost overview dashboard

---

> **Document Version**: 2.0
> **Last Updated**: 2026-06-06
> **Primary Language**: English (technical reference)
> **Consolidated from**: 架构说明.md, 部署文档.md, 生产部署方案.md, project audit findings
