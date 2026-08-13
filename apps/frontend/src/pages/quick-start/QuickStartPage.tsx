import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './quick-start.css';

type Preset = {
  id: string;
  label: string;
  description: string;
  accent: string;
  shots: string[];
};

const presets: Preset[] = [
  {
    id: 'product-launch',
    label: 'Product launch',
    description: 'A crisp reveal with a proof point and a direct call to action.',
    accent: '#b6a3ff',
    shots: ['Hook · 0–03s', 'Proof · 03–10s', 'CTA · 10–15s'],
  },
  {
    id: 'creator-review',
    label: 'Creator review',
    description: 'A human, conversational edit that moves from claim to demonstration.',
    accent: '#ffb38b',
    shots: ['Cold open · 0–04s', 'Demo · 04–12s', 'Takeaway · 12–18s'],
  },
  {
    id: 'social-cut',
    label: 'Social cut',
    description: 'A fast vertical cut with captions, rhythm, and a loopable ending.',
    accent: '#7ee7d0',
    shots: ['Pattern break · 0–02s', 'Highlights · 02–09s', 'Loop · 09–12s'],
  },
];

const formats = [
  { id: 'vertical', label: '9:16', sublabel: 'Shorts / Reels' },
  { id: 'square', label: '1:1', sublabel: 'Feed / Product' },
  { id: 'landscape', label: '16:9', sublabel: 'YouTube / Web' },
] as const;

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

export default function QuickStartPage() {
  const [presetId, setPresetId] = useState(presets[0].id);
  const [formatId, setFormatId] = useState<(typeof formats)[number]['id']>('vertical');
  const preset = useMemo(
    () => presets.find((item) => item.id === presetId) ?? presets[0],
    [presetId]
  );
  const format = formats.find((item) => item.id === formatId) ?? formats[0];

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Try VidForge — Build a video pipeline in 60 seconds';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="quick-start-page">
      <nav className="quick-start-nav" aria-label="Quick start navigation">
        <Link className="quick-start-brand" to="/" aria-label="Back to VidForge home">
          <span>VF</span>
          VidForge
        </Link>
        <div className="quick-start-nav-links">
          <Link to="/">Overview</Link>
          <a href="https://github.com/WANGLEVY9/VidForge" target="_blank" rel="noreferrer">
            Source ↗
          </a>
          <Link className="quick-start-nav-cta" to="/auth/register">
            Create workspace <ArrowIcon />
          </Link>
        </div>
      </nav>

      <section className="quick-start-hero" aria-labelledby="quick-start-title">
        <div className="quick-start-copy">
          <p className="quick-start-eyebrow">
            <span /> Interactive product tour
          </p>
          <h1 id="quick-start-title">
            See the pipeline
            <br />
            <em>before you run it.</em>
          </h1>
          <p className="quick-start-lede">
            Shape a video brief, choose a delivery format, and inspect the agent plan. This demo is
            local to your browser—no login, API key, upload, or hidden request required.
          </p>
          <div className="quick-start-trust">
            <span>01 · Brief</span>
            <i />
            <span>02 · Plan</span>
            <i />
            <span>03 · Review</span>
          </div>
        </div>

        <div className="quick-start-console" aria-label="Interactive video brief preview">
          <div className="quick-start-console-bar">
            <span className="quick-start-dots">
              <i />
              <i />
              <i />
            </span>
            <span>new video brief / preview</span>
            <span className="quick-start-live">
              <i /> local demo
            </span>
          </div>
          <div className="quick-start-console-body">
            <div className="quick-start-controls">
              <div className="quick-start-control-block">
                <p>Start with a shape</p>
                <div className="quick-start-preset-list">
                  {presets.map((item) => (
                    <button
                      type="button"
                      className={item.id === preset.id ? 'is-active' : ''}
                      onClick={() => setPresetId(item.id)}
                      key={item.id}
                    >
                      <span style={{ backgroundColor: item.accent }} />
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className="quick-start-control-block">
                <p>Delivery format</p>
                <div
                  className="quick-start-format-list"
                  role="radiogroup"
                  aria-label="Delivery format"
                >
                  {formats.map((item) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={item.id === format.id}
                      className={item.id === format.id ? 'is-active' : ''}
                      onClick={() => setFormatId(item.id)}
                      key={item.id}
                    >
                      <strong>{item.label}</strong>
                      <small>{item.sublabel}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="quick-start-plan">
              <div className={`quick-start-frame frame-${format.id}`}>
                <div className="quick-start-frame-grid" />
                <span className="quick-start-frame-label">{format.label}</span>
                <div className="quick-start-frame-object" style={{ borderColor: preset.accent }}>
                  <span style={{ backgroundColor: preset.accent }} />
                </div>
                <strong>{preset.label}</strong>
                <small>Agent preview · ready to inspect</small>
              </div>
              <div className="quick-start-plan-copy">
                <div className="quick-start-plan-heading">
                  <div>
                    <p>Generated plan</p>
                    <h2>
                      {preset.label} / {format.label}
                    </h2>
                  </div>
                  <span className="quick-start-ready">Draft</span>
                </div>
                <div className="quick-start-shot-list">
                  {preset.shots.map((shot, index) => (
                    <div key={shot}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{shot}</strong>
                      <i />
                    </div>
                  ))}
                </div>
                <p className="quick-start-plan-note">
                  The real workspace turns this outline into editable script, assets, agent runs,
                  and a traceable media export.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="quick-start-next" aria-labelledby="quick-start-next-title">
        <div>
          <p className="quick-start-eyebrow">
            <span /> From concept to control
          </p>
          <h2 id="quick-start-next-title">A fast demo with a serious next step.</h2>
        </div>
        <div className="quick-start-next-grid">
          <article>
            <span>01</span>
            <h3>Bring your own context</h3>
            <p>Product knowledge and brand rules keep generated scripts grounded.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Watch the agents work</h3>
            <p>
              Every node reports progress, retries, and quality signals instead of hiding the run.
            </p>
          </article>
          <article>
            <span>03</span>
            <h3>Keep the artifacts</h3>
            <p>Scripts, assets, traces, and exports remain inspectable in one workspace.</p>
          </article>
        </div>
        <Link className="quick-start-primary-button" to="/auth/register">
          Open the full workspace <ArrowIcon />
        </Link>
      </section>
    </main>
  );
}
