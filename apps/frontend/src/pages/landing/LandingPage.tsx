import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './landing.css';

const repositoryUrl = 'https://github.com/WANGLEVY9/VidForge';

const pipelineStages = [
  {
    id: 'understand',
    step: '01',
    label: 'Understand',
    title: 'Multimodal asset understanding',
    description:
      'Turn product images and source media into structured visual, product, and editing signals ready for retrieval.',
    output: 'Structured tags · captions · embeddings',
  },
  {
    id: 'write',
    step: '02',
    label: 'Write',
    title: 'Retrieval-grounded scripts',
    description:
      'Combine product context, brand voice, compliance rules, and relevant script patterns into editable storyboards.',
    output: 'Hook · demonstration · call to action',
  },
  {
    id: 'orchestrate',
    step: '03',
    label: 'Orchestrate',
    title: 'Multi-agent execution',
    description:
      'Coordinate material, script, composition, and quality nodes with traceable state and conditional replanning.',
    output: 'LangGraph state · traces · recovery paths',
  },
  {
    id: 'compose',
    step: '04',
    label: 'Compose',
    title: 'Media assembly and export',
    description:
      'Assemble generated shots with voice, music, subtitles, and format-aware FFmpeg export workflows.',
    output: 'Vertical or landscape video · export trace',
  },
] as const;

const capabilities = [
  {
    number: '01',
    title: 'Traceable by design',
    body: 'Model calls, agent nodes, queue work, latency, and estimated cost share one observable execution story.',
  },
  {
    number: '02',
    title: 'Graceful degradation',
    body: 'Optional Redis, TTS, and retrieval services have explicit fallbacks so local exploration stays approachable.',
  },
  {
    number: '03',
    title: 'Commerce-aware',
    body: 'Product spaces preserve brand voice, selling points, custom prohibited terms, and reusable knowledge.',
  },
  {
    number: '04',
    title: 'Built for extension',
    body: 'Typed services and modular NestJS boundaries make providers, policies, and workflow nodes replaceable.',
  },
] as const;

const stack = [
  'React',
  'TypeScript',
  'NestJS',
  'LangGraph',
  'FFmpeg',
  'PostgreSQL',
  'pgvector',
  'BullMQ',
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49v-1.92c-2.78.62-3.37-1.2-3.37-1.2-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.66.35-1.12.64-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.94a9.3 9.3 0 0 1 2.5.34c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9v2.81c0 .27.18.59.69.49A10.23 10.23 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

export default function LandingPage() {
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'VidForge — Open-source AI video production pipeline';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const stage = pipelineStages[activeStage];

  return (
    <div className="landing-page">
      <a className="landing-skip-link" href="#landing-main">
        Skip to content
      </a>

      <header className="landing-header">
        <a className="landing-brand" href="#top" aria-label="VidForge home">
          <span className="landing-brand-mark" aria-hidden="true">
            VF
          </span>
          <span>VidForge</span>
        </a>
        <nav className="landing-nav" aria-label="Primary navigation">
          <a href="#capabilities">Capabilities</a>
          <a href="#pipeline">Pipeline</a>
          <a href="#open-source">Open source</a>
        </nav>
        <div className="landing-header-actions">
          <a
            className="landing-icon-link"
            href={repositoryUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="View VidForge on GitHub"
          >
            <GitHubIcon />
          </a>
          <Link className="landing-button landing-button-small" to="/workspace">
            Open workspace
          </Link>
        </div>
      </header>

      <main id="landing-main">
        <section className="landing-hero" id="top">
          <div className="landing-hero-glow" aria-hidden="true" />
          <div className="landing-hero-content">
            <p className="landing-eyebrow">
              <span aria-hidden="true" /> MIT licensed · Community driven
            </p>
            <h1>
              Product media in.
              <br />
              <em>Video pipelines out.</em>
            </h1>
            <p className="landing-hero-copy">
              An open-source workspace for multimodal assets, retrieval-grounded scripts,
              multi-agent orchestration, and traceable video composition.
            </p>
            <p className="landing-hero-copy-cn">
              从商品素材理解到脚本、编排与合成，一条可观察、可扩展的 AI 视频生产链路。
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-button landing-button-primary" to="/workspace">
                Explore the workspace <ArrowIcon />
              </Link>
              <a
                className="landing-button landing-button-ghost"
                href={repositoryUrl}
                target="_blank"
                rel="noreferrer"
              >
                <GitHubIcon /> View source
              </a>
            </div>
            <p className="landing-status-note">
              Active development · AI providers and backend services require local configuration
            </p>
          </div>

          <figure className="landing-hero-visual">
            <img
              src="/media/vidforge-pipeline-hero.webp"
              alt="Concept illustration of product assets flowing through an AI storyboard into vertical video frames"
              width="1600"
              height="854"
              fetchPriority="high"
            />
            <figcaption>
              Concept visual · the interface below reflects the implemented architecture
            </figcaption>
          </figure>
        </section>

        <section className="landing-stack" aria-label="Technology stack">
          <span>Built with</span>
          <div>
            {stack.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </section>

        <section className="landing-section" id="capabilities">
          <div className="landing-section-heading">
            <p className="landing-kicker">Why VidForge</p>
            <h2>A production-shaped foundation, open for inspection.</h2>
            <p>
              VidForge connects AI generation with the less glamorous work that makes a pipeline
              understandable: state, fallbacks, policy checks, queues, and traces.
            </p>
          </div>
          <div className="landing-capability-grid">
            {capabilities.map((capability) => (
              <article className="landing-capability-card" key={capability.number}>
                <span>{capability.number}</span>
                <h3>{capability.title}</h3>
                <p>{capability.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-pipeline-section" id="pipeline">
          <div className="landing-section-heading landing-section-heading-row">
            <div>
              <p className="landing-kicker">Interactive pipeline</p>
              <h2>Follow the work, not just the final file.</h2>
            </div>
            <p>
              Select a stage to see what moves between modules. The same boundaries guide the
              repository structure and trace model.
            </p>
          </div>

          <div className="landing-pipeline-shell">
            <div className="landing-stage-tabs" role="tablist" aria-label="Video pipeline stages">
              {pipelineStages.map((item, index) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeStage === index}
                  aria-controls="pipeline-stage-panel"
                  className={activeStage === index ? 'is-active' : ''}
                  onClick={() => setActiveStage(index)}
                  key={item.id}
                >
                  <span>{item.step}</span>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="landing-stage-panel" id="pipeline-stage-panel" role="tabpanel">
              <div className="landing-stage-copy">
                <p>Stage {stage.step}</p>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
                <div>
                  <span>OUTPUT</span>
                  <strong>{stage.output}</strong>
                </div>
              </div>
              <div className={`landing-stage-visual stage-${stage.id}`} aria-hidden="true">
                <span className="landing-orbit orbit-one" />
                <span className="landing-orbit orbit-two" />
                <div className="landing-node node-source">IN</div>
                <div className="landing-node node-core">{stage.step}</div>
                <div className="landing-node node-output">OUT</div>
                <span className="landing-flow flow-one" />
                <span className="landing-flow flow-two" />
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-architecture">
          <div className="landing-architecture-copy">
            <p className="landing-kicker">Inspectable architecture</p>
            <h2>Swap providers without losing the workflow.</h2>
            <p>
              Typed service boundaries keep model providers, storage, queues, and media tooling
              replaceable. PostgreSQL remains the source of truth while optional services add
              retrieval and durable execution.
            </p>
            <a
              href={`${repositoryUrl}/blob/main/docs/TECHNICAL_ARCHITECTURE.md`}
              target="_blank"
              rel="noreferrer"
            >
              Read the technical architecture <ArrowIcon />
            </a>
          </div>
          <div className="landing-architecture-map" aria-label="VidForge architecture overview">
            <div className="architecture-column">
              <span>EXPERIENCE</span>
              <strong>React workspace</strong>
              <small>Storyboard · analytics · review</small>
            </div>
            <i aria-hidden="true" />
            <div className="architecture-column architecture-column-accent">
              <span>ORCHESTRATION</span>
              <strong>NestJS + LangGraph</strong>
              <small>Agents · policy · traces · queues</small>
            </div>
            <i aria-hidden="true" />
            <div className="architecture-column">
              <span>RUNTIME</span>
              <strong>Models + FFmpeg</strong>
              <small>Vision · text · video · composition</small>
            </div>
          </div>
        </section>

        <section className="landing-section landing-open-source" id="open-source">
          <div>
            <p className="landing-kicker">Open by default</p>
            <h2>Build the missing piece with us.</h2>
          </div>
          <p>
            Start with a documented contribution idea, propose a provider integration, improve
            observability, or help make commerce-video workflows easier to reproduce.
          </p>
          <div className="landing-community-links">
            <a href={`${repositoryUrl}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer">
              Contribution guide <ArrowIcon />
            </a>
            <a href={`${repositoryUrl}/issues`} target="_blank" rel="noreferrer">
              Good first issues <ArrowIcon />
            </a>
            <a href={`${repositoryUrl}/discussions`} target="_blank" rel="noreferrer">
              Join discussions <ArrowIcon />
            </a>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-brand">
          <span className="landing-brand-mark" aria-hidden="true">
            VF
          </span>
          <span>VidForge</span>
        </div>
        <p>Open-source AI video production infrastructure.</p>
        <div>
          <a href={`${repositoryUrl}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
            MIT License
          </a>
          <a href={`${repositoryUrl}/blob/main/SECURITY.md`} target="_blank" rel="noreferrer">
            Security
          </a>
          <a href={repositoryUrl} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
