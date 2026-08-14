<p align="center">
  <img src="./.github/assets/social-preview.jpg" alt="VidForge — Multi-Agent Video-Workspace" width="920" />
</p>

<h1 align="center">VidForge</h1>

<p align="center"><strong>Open-Source-Multi-Agent-Infrastruktur für wissensbasierte Videogenerierung.</strong><br />
VidForge verbindet Medienverständnis, Markenwissen, Kontext-Engineering, Skriptplanung, Videogenerierung, Qualitätsfeedback und Medienkomposition zu einer beobachtbaren Pipeline.</p>

<p align="center">
  <a href="./README.md">English</a> · <a href="./README.zh-CN.md">简体中文</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.ru.md">Русский</a>
</p>

<p align="center">
  <a href="https://github.com/WANGLEVY9/VidForge/actions/workflows/ci.yml"><img src="https://github.com/WANGLEVY9/VidForge/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-d6b36a.svg" alt="MIT-Lizenz" /></a>
  <img src="https://img.shields.io/badge/stack-TypeScript-3178c6.svg" alt="TypeScript" />
</p>

<p align="center"><a href="https://vid-forge-frontend-nu.vercel.app/">Demo</a> · <a href="./docs/AGENT_RUNTIME.md">Agent-Runtime</a> · <a href="./docs/TECHNICAL_ARCHITECTURE.md">Architektur</a> · <a href="./ROADMAP.md">Roadmap</a></p>

> **Status: aktive Entwicklung.** VidForge kann ohne kostenpflichtige Modellzugänge gebaut und getestet werden. Für echte Text-, Bild-, Video- und TTS-Generierung werden die jeweiligen Provider benötigt. Die öffentliche Demo ist ein unabhängiges Deployment und aktiviert möglicherweise nicht alle Provider.

## Was ist VidForge?

VidForge ist ein selbst hostbarer KI-Video-Workspace für Commerce und Produkt-Storytelling. Eine Anfrage wird nicht als einzelner Modellaufruf behandelt, sondern als zustandsbehafteter Workflow: Spezialisierte Agents suchen Assets, bauen begrenzten Kontext auf, planen ein Storyboard, rufen Medien-Provider auf, bewerten das Ergebnis und geben Qualitätsbelege an den nächsten Versuch zurück.

| Bereich                     | Implementierung                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| Multi-Agent-Orchestrierung  | Expliziter LangGraph-State, spezialisierte Nodes, bedingte Neuplanung, begrenzte Retries und Abbruch |
| Wissensbasierte Generierung | Script-RAG, Produktbereich-Wissen, Mediensuche und nachvollziehbare Referenzen                       |
| Kontext-Engineering         | Bereichsbezogenes Langzeitgedächtnis, Retrieval-Scores, Prompt-Budgets, Bereinigung und Feedback     |
| Ausführbare Video-Pipeline  | Parallele Shot-Erzeugung, FFmpeg, TTS, Musik, Untertitel, Storage und Fortschritt                    |

## Multi-Agent-Runtime

```text
START → orchestrator → material_analysis → script_generation
                                      ↓                    ↓
                              quality_control ← video_composition
                                      │
                                      └── begrenzte Qualitäts-Neuplanung → script_generation
```

| Agent             | Aufgabe                                                                    | Ausgabe                                  |
| ----------------- | -------------------------------------------------------------------------- | ---------------------------------------- |
| Material Agent    | Sucht Bilder im Benutzer- und Produktbereich und sortiert deterministisch  | Bis zu fünf Medienkandidaten             |
| Script Agent      | Verbindet Anfrage, Medien, RAG, Memory und vorheriges Qualitätsfeedback    | Drei-Shot-Plan Hook / Demo / CTA         |
| Composition Agent | Erzeugt Shots in begrenzten parallelen Batches und pollt Provider-Aufgaben | Shot-Ergebnisse und finale Medien-URL    |
| Quality Agent     | Prüft Vollständigkeit, Dauer, Konsistenz, Compliance und Hook              | Fünf Dimensionen und Neuplanungsfeedback |

Das System verwendet einen expliziten Graphen statt eines unkontrollierten Agent-Swarms. Provider- und vorübergehende Netzwerkfehler erhalten begrenzte Retries mit exponentiellem Backoff und Jitter. Abbrüche, Eingabefehler und HTTP 4xx werden nicht wiederholt; Qualitäts-Neuplanung wird separat durch `AGENT_QC_MAX_RETRIES` begrenzt.

## Wissen, RAG, Kontext und Memory

Drei Wissensebenen werden getrennt gehalten:

- **Produktbereich-Wissen**: Verkaufsargumente, Zielgruppe, Markenton, Preispositionierung, verbotene Wörter und bis zu fünf hochwertige Skriptmuster. Nur nicht-fallback Runs mit Score mindestens 85 schreiben Best Practices idempotent zurück.
- **Script-RAG-Korpus**: Neun strukturierte Seeds in sieben Commerce-Kategorien. Jede Seed enthält Hook-Typ, Hook-/Demo-/CTA-Skelett, Nachrichtenbeispiele, Musikrichtung und Herkunftsmetadaten.
- **Mediensuche**: Benutzer-/Produktbereich-Isolation, Tags, Analysemetadaten, Captions und optionales 1024-dimensionales pgvector-Embedding. Der aktuelle Agent kombiniert SQL und deterministische Heuristiken; die semantische API ist die Erweiterungsstelle für Embedding-Provider.

Die Script-RAG-Suche ist deterministisch und reproduzierbar: Kategorie-Matches haben das höchste Gewicht, Stil-Matches ein sekundäres Gewicht, Teilmatches einen kleinen Bonus. Standardmäßig werden die zwei besten Seeds an den Prompt übergeben und in `ragReferences` dokumentiert. Das eingebaute Korpus ist eine Entwicklungsbasis, kein Conversion-Benchmark.

Das Langzeitgedächtnis `agent_memories` unterstützt die Scopes `user`, `product_space` und `run` sowie die Typen `preference`, `fact`, `success_pattern`, `failure_pattern` und `decision`.

```text
score = lexical_match × 0.65 + importance × 0.25 + recency × 0.10
```

Das Context Packet filtert schwache Treffer, begrenzt Anzahl und Zeichen, entfernt Steuerzeichen und kennzeichnet Memory als Referenzdaten statt als Anweisung. Memory-Fehler sind fail-soft und stoppen die Videogenerierung nicht.

## Qualitätsschleife und Medienpipeline

Quality Agent gewichtet Vollständigkeit mit 30 %, Dauer mit 15 %, Konsistenz mit 20 %, Compliance mit 20 % und Hook-Stärke mit 15 %. Ein gewichteter Score ab 70 ohne Compliance-Treffer gilt als erfolgreich; andernfalls geht strukturiertes Feedback für eine begrenzte Neuplanung an den Script Agent zurück.

Composition Agent erzeugt bis zu drei Shots parallel, pollt bis zu acht Minuten, normalisiert und verbindet sie mit FFmpeg, erzeugt Sprache oder eine Stille-Fallback, mischt Musik, erstellt SRT-Untertitel und veröffentlicht lokal oder in OSS. Das Ergebnis enthält Dauer, Größe, SHA-256 und Medienmerkmale. Ohne Video-Provider wird die fehlende Fähigkeit gemeldet, statt einen Placeholder als fertiges Ergebnis auszugeben.

## Provider, Queues und Observability

Text, Video, TTS, Objektspeicher und Medienverarbeitung sind durch fachliche TypeScript-Verträge getrennt. Aktuelle Adapter sind ARK, Volcano/OpenSpeech TTS, Aliyun OSS und FFmpeg. BullMQ verarbeitet Shot-Erzeugung, Komposition, Export und Medienanalyse; lokal kann Redis bei Ausfall auf einen Prozess-Fallback zurückfallen.

`trace_spans` erfasst Aufgabe, Scope, Latenz, Status, Modell, Tokens, geschätzte Kosten, Cache-Hit und Metadaten. Der Agent-Workflow erfasst zusätzlich Retries, Trace-Spans, Memory-Hits, den höchsten Memory-Score und RAG-Referenzen. Trace-Schreibfehler sind fail-soft.

## Implementiert und Roadmap

Implementiert: Frontend-Workspace, Authentifizierung, Produktbereiche, Medien, Skripte, Aufgaben, Multi-Agent-Graph, Qualitäts-Neuplanung, Basis-RAG, bereichsbezogenes Memory, FFmpeg-Komposition und optionale Redis/BullMQ-Pfade.

Roadmap: persistente LangGraph-Checkpoints, Wiederaufnahme nach Worker-Neustart, menschliche Freigabe und interrupt-resume, dynamischer Subagent-Router, berechtigungsbewusste Skills/Tools, hybrides RAG mit Reranker und Agent-Trajectory-Evaluation.

Design-Referenzen sind [LangGraph.js](https://github.com/langchain-ai/langgraphjs), [DeerFlow](https://github.com/bytedance/deer-flow), [Letta](https://github.com/letta-ai/letta) und [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents). Daraus folgt weder Feature-Parität noch Code-Wiederverwendung.

## Schnellstart

Voraussetzungen: Node.js 20, pnpm `8.15.4`, Docker Compose und FFmpeg 4+.

```bash
git clone https://github.com/WANGLEVY9/VidForge.git
cd VidForge
corepack enable
corepack prepare pnpm@8.15.4 --activate
pnpm install --frozen-lockfile
docker compose up -d
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
pnpm --filter @vidforge/backend migration:run
pnpm check:env
pnpm dev
```

Frontend: `http://localhost:3000`, Erlebnisfluss `/try`, Workspace `/workspace`, API `http://localhost:3001/api`, Swagger `/api/docs`. Für echte Generierung sind Provider-Zugangsdaten erforderlich. Prüfungen: `pnpm docs:check`, `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm verify`.

## API und Beiträge

Wichtige Endpunkte sind `POST /api/agent/run`, `GET /api/agent/status/:taskId`, `POST /api/agent/cancel/:taskId`, `GET /api/agent/memory`, `GET /api/spaces` und `PATCH /api/material/:id/analyze`. Swagger ist die maßgebliche Referenz für Request und Response.

Beiträge zu Provider-Adaptern, RAG-Evaluation, Memory-Konsolidierung, Checkpoints, menschlicher Freigabe, Videoqualität, Untertiteln, Audio, Accessibility und Deployment-Zuverlässigkeit sind willkommen. Bitte zuerst [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`docs/CONTRIBUTOR_QUICKSTART.md`](./docs/CONTRIBUTOR_QUICKSTART.md) und [`GOVERNANCE.md`](./GOVERNANCE.md) lesen.

Keine API-Keys, JWT-Secrets, Datenbankzugänge oder Nutzerdaten committen. VidForge steht unter der [MIT License](./LICENSE) und ist unabhängig von den genannten Projekten und Unternehmen.

Die vollständige technische Dokumentation steht in [`README.md`](./README.md).
