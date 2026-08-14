<p align="center">
  <img src="./.github/assets/social-preview.jpg" alt="VidForge — espace de génération vidéo Multi-Agent" width="920" />
</p>

<h1 align="center">VidForge</h1>

<p align="center"><strong>Une infrastructure open source Multi-Agent pour la génération vidéo fondée sur les connaissances.</strong><br />
VidForge relie compréhension des médias, connaissances de marque, ingénierie du contexte, planification de scripts, génération vidéo, contrôle qualité et assemblage média.</p>

<p align="center">
  <a href="./README.md">English</a> · <a href="./README.zh-CN.md">简体中文</a> · <a href="./README.ja.md">日本語</a> · <a href="./README.fr.md">Français</a> · <a href="./README.de.md">Deutsch</a> · <a href="./README.ru.md">Русский</a>
</p>

<p align="center">
  <a href="https://github.com/WANGLEVY9/VidForge/actions/workflows/ci.yml"><img src="https://github.com/WANGLEVY9/VidForge/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-d6b36a.svg" alt="Licence MIT" /></a>
  <img src="https://img.shields.io/badge/stack-TypeScript-3178c6.svg" alt="TypeScript" />
</p>

<p align="center"><a href="https://vid-forge-frontend-nu.vercel.app/">Démo</a> · <a href="./docs/AGENT_RUNTIME.md">Runtime Agent</a> · <a href="./docs/TECHNICAL_ARCHITECTURE.md">Architecture</a> · <a href="./ROADMAP.md">Feuille de route</a></p>

> **Statut : développement actif.** VidForge peut être compilé et testé sans identifiants de modèles payants. La génération réelle de texte, d’images, de vidéos et de voix nécessite les Providers correspondants. La démo publique est un déploiement indépendant et peut ne pas activer tous les Providers.

## Qu’est-ce que VidForge ?

VidForge est un espace de production vidéo IA auto-hébergeable destiné au commerce et au storytelling produit. Une demande devient un workflow avec état : des Agents spécialisés recherchent des assets, construisent un contexte borné, planifient un storyboard, appellent les Providers média, évaluent le résultat et réinjectent les preuves de qualité dans l’essai suivant.

| Préoccupation                           | Implémentation                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Orchestration Multi-Agent               | État LangGraph explicite, nœuds spécialisés, replanification conditionnelle, retries bornés, annulation |
| Génération fondée sur les connaissances | Script RAG, connaissances d’espace produit, recherche média et références traçables                     |
| Ingénierie du contexte                  | Mémoire long terme par scope, scores de recherche, budget de prompt, nettoyage et feedback              |
| Pipeline vidéo exécutable               | Génération parallèle de plans, FFmpeg, TTS, musique, sous-titres, stockage et progression               |

## Runtime Multi-Agent

```text
START → orchestrator → material_analysis → script_generation
                                      ↓                    ↓
                              quality_control ← video_composition
                                      │
                                      └── replanification qualité bornée → script_generation
```

| Agent             | Responsabilité                                                                    | Sortie                                |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------------------- |
| Material Agent    | Recherche des images dans l’espace utilisateur/produit et classement déterministe | Jusqu’à 5 candidats média             |
| Script Agent      | Fusion de la demande, des médias, du RAG, de la mémoire et du feedback précédent  | Plan Hook / Demo / CTA en trois plans |
| Composition Agent | Génération par lots parallèles bornés et polling des tâches Provider              | Résultats des plans et URL finale     |
| Quality Agent     | Évaluation de la complétude, durée, cohérence, conformité et Hook                 | Score à cinq dimensions et feedback   |

Le système utilise un graphe explicite, pas un essaim d’Agents non contrôlé. Les erreurs Provider et réseau transitoires utilisent un retry borné avec backoff exponentiel et jitter. Les annulations, erreurs d’entrée et HTTP 4xx ne sont pas retentés ; la replanification qualité possède sa propre limite `AGENT_QC_MAX_RETRIES`.

## Connaissances, RAG et mémoire

Trois plans de connaissances sont séparés :

- **Espace produit** : arguments de vente, audience, ton de marque, positionnement prix, mots interdits et jusqu’à cinq modèles de scripts de qualité. Seuls les runs non-fallback avec un score d’au moins 85 alimentent les bonnes pratiques de façon idempotente.
- **Corpus Script RAG** : 9 seeds structurées couvrant 7 catégories commerciales. Chaque seed contient un type de Hook, un squelette Hook / Demo / CTA, des exemples de messages, une direction musicale et des métadonnées de provenance.
- **Recherche média** : isolation utilisateur/espace produit, tags, métadonnées d’analyse, légendes et embedding pgvector optionnel de 1024 dimensions. L’Agent actuel combine SQL et heuristiques déterministes ; l’API sémantique fournit un point d’extension pour un Provider d’embeddings.

La recherche Script RAG est déterministe et reproductible : la correspondance de catégorie domine, le style apporte un score secondaire, les correspondances partielles un bonus réduit. Les deux meilleures seeds sont transmises au prompt et leurs identifiants restent dans `ragReferences`. Le corpus intégré est une base de développement, pas un benchmark de conversion.

La mémoire long terme `agent_memories` accepte les scopes `user`, `product_space` et `run`, ainsi que les types `preference`, `fact`, `success_pattern`, `failure_pattern` et `decision`.

```text
score = lexical_match × 0.65 + importance × 0.25 + recency × 0.10
```

Le Context Packet filtre les résultats faibles, impose des budgets de quantité et de caractères, supprime les caractères de contrôle et présente la mémoire comme donnée de référence, jamais comme instruction. Les erreurs de mémoire sont fail-soft et ne bloquent pas la génération.

## Boucle qualité et pipeline média

Quality Agent pondère la complétude à 30 %, la durée à 15 %, la cohérence à 20 %, la conformité à 20 % et la force du Hook à 15 %. Un score pondéré d’au moins 70 sans terme de conformité déclenche la réussite ; sinon le feedback structuré revient au Script Agent pour une replanification bornée.

Composition Agent génère jusqu’à trois plans en parallèle, les interroge pendant huit minutes, normalise et concatène avec FFmpeg, produit une voix ou un silence de secours, mélange la musique, génère les sous-titres SRT et publie vers le stockage local ou OSS. Le résultat expose durée, taille, SHA-256 et caractéristiques média. Sans Provider vidéo, le système signale la capacité manquante au lieu de présenter un placeholder comme produit fini.

## Providers, files et observabilité

Les capacités texte, vidéo, TTS, stockage objet et traitement média sont isolées par des contrats TypeScript métier. Les adaptateurs actuels couvrent ARK, Volcano/OpenSpeech TTS, Aliyun OSS et FFmpeg. BullMQ gère les plans, la composition, l’export et l’analyse ; Redis indisponible peut utiliser un fallback en mémoire en développement.

`trace_spans` enregistre tâche, scope, latence, état, modèle, tokens, coût estimé, cache et métadonnées. Le workflow ajoute les retries, spans, hits mémoire, score mémoire maximal et références RAG. Les écritures de trace sont fail-soft.

## Implémenté et feuille de route

Implémenté : workspace frontend, authentification, espaces produit, médias, scripts, tâches, graphe Multi-Agent, replanification qualité, RAG de base, mémoire scopée, composition FFmpeg et chemins Redis/BullMQ optionnels.

Feuille de route : checkpoints LangGraph persistants, reprise après redémarrage Worker, approbation humaine et interrupt-resume, routeur de subagents, registre de skills/tools, RAG hybride avec reranker et évaluation des trajectoires Agent.

Références de conception : [LangGraph.js](https://github.com/langchain-ai/langgraphjs), [DeerFlow](https://github.com/bytedance/deer-flow), [Letta](https://github.com/letta-ai/letta) et [Claude Code subagents](https://code.claude.com/docs/en/sub-agents). Ces liens n’impliquent ni parité fonctionnelle ni réutilisation de code.

## Démarrage rapide

Prérequis : Node.js 20, pnpm `8.15.4`, Docker Compose et FFmpeg 4+.

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

Frontend : `http://localhost:3000`, parcours `/try`, workspace `/workspace`, API `http://localhost:3001/api`, Swagger `/api/docs`. Les vrais Providers sont nécessaires pour générer des médias. Vérifications : `pnpm docs:check`, `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm verify`.

## API et contribution

Endpoints représentatifs : `POST /api/agent/run`, `GET /api/agent/status/:taskId`, `POST /api/agent/cancel/:taskId`, `GET /api/agent/memory`, `GET /api/spaces`, `PATCH /api/material/:id/analyze`. Swagger fait foi pour les requêtes et réponses.

Les contributions sur les adaptateurs Provider, l’évaluation RAG, la consolidation mémoire, les checkpoints, l’approbation humaine, la qualité vidéo, l’accessibilité et la fiabilité du déploiement sont les bienvenues. Consultez [`CONTRIBUTING.md`](./CONTRIBUTING.md), [`docs/CONTRIBUTOR_QUICKSTART.md`](./docs/CONTRIBUTOR_QUICKSTART.md) et [`GOVERNANCE.md`](./GOVERNANCE.md).

Ne commitez jamais de clés API, secrets JWT, identifiants de base de données ou données utilisateur. VidForge est distribué sous [MIT License](./LICENSE) et reste indépendant des projets et entreprises cités.

Pour la documentation technique complète, consultez [`README.md`](./README.md).
