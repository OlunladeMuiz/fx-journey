import React from "react";
import { highlightText, joinClassNames } from "../lib/ui";

export function TickerBar({ items }) {
  const ticker = [...items, ...items].join("  •  ");

  return (
    <div className="ticker-shell" aria-hidden="true">
      <div className="ticker-glow" />
      <div className="ticker-track">
        <div className="ticker-row">
          <span>{ticker}</span>
        </div>
        <div className="ticker-row">
          <span>{ticker}</span>
        </div>
      </div>
    </div>
  );
}

const SPLASH_BADGES = ["FOUNDATION", "PRO PATTERNS", "PERSISTENT STORAGE"];
const SPLASH_STEPS = [
  { label: "BOOT / STORAGE", detail: "Syncing progress maps", tone: "amber" },
  { label: "LOAD / CURRICULUM", detail: "Preparing the 12-week route", tone: "green" },
  { label: "SYNC / COACH", detail: "Warming the guidance layer", tone: "blue" },
];

export function SplashScreen() {
  return (
    <div className="splash-screen" role="presentation" aria-hidden="true">
      <div className="splash-screen__ambient splash-screen__ambient--amber" />
      <div className="splash-screen__ambient splash-screen__ambient--green" />
      <div className="splash-screen__ambient splash-screen__ambient--blue" />
      <div className="splash-screen__grain" />

      <div className="splash-screen__frame">
        <div className="splash-screen__copy">
          <div className="section-kicker">MUIZ PRESENTS</div>
          <div className="splash-screen__eyebrow">THE TRADING BIBLE SYSTEM</div>
          <h1>FX JOURNEY</h1>
          <p className="splash-screen__lead">A chart-first forex learning system that turns passive reading into disciplined live reps.</p>

          <div className="splash-screen__chips">
            {SPLASH_BADGES.map((badge) => (
              <span key={badge} className="splash-chip">
                {badge}
              </span>
            ))}
          </div>

          <div className="splash-screen__meter">
            <div className="splash-screen__meter-head">
              <span>STARTUP SEQUENCE</span>
              <span>1600MS</span>
            </div>
            <div className="splash-screen__meter-bar" aria-hidden="true">
              <span className="splash-screen__meter-fill" />
            </div>
          </div>
        </div>

        <div className="splash-screen__art">
          <div className="splash-screen__ring splash-screen__ring--outer" />
          <div className="splash-screen__ring splash-screen__ring--inner" />
          <div className="splash-screen__core">
            <div className="splash-screen__sigil">FX</div>
            <div className="splash-screen__pulse" />
          </div>

          <div className="splash-screen__status-list">
            {SPLASH_STEPS.map((step, index) => (
              <div key={step.label} className={joinClassNames("splash-screen__status", `splash-screen__status--${step.tone}`)}>
                <span className="splash-screen__status-index">0{index + 1}</span>
                <span className="splash-screen__status-copy">
                  <strong>{step.label}</strong>
                  <span>{step.detail}</span>
                </span>
                <span className="splash-screen__status-dot" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="splash-screen__footer">
        <span>MUIZ / FX JOURNEY / 12 WEEKS TO THE EDGE</span>
        <span>LAUNCHING IN 1600MS</span>
      </div>
    </div>
  );
}

export function OverallProgress({ percent, done, total, accent }) {
  return (
    <div
      className="progress-orb"
      style={{
        "--orb-accent": accent,
        "--orb-fill": `${percent * 3.6}deg`,
      }}
      aria-label={`Overall progress ${percent}%`}
    >
      <div className="progress-orb__core">
        <div className="progress-orb__percent">{percent}%</div>
        <div className="progress-orb__meta">
          {done}/{total}
        </div>
      </div>
    </div>
  );
}

export function StreakBadge({ streak }) {
  const tone = streak >= 60 ? "blue" : streak >= 30 ? "green" : streak >= 7 ? "amber" : "muted";

  return (
    <div className={joinClassNames("streak-badge", `streak-badge--${tone}`, streak >= 7 && "pulse")}>
      <span className="streak-badge__spark">🔥</span>
      <span className="streak-badge__text">{streak}-DAY STREAK</span>
    </div>
  );
}

export function SearchBar({ value, onChange, resultCount }) {
  return (
    <div className="search-shell">
      <label className="search-label" htmlFor="concept-search">
        Search concepts
      </label>
      <div className="search-input-wrap">
        <span className="search-icon">⌕</span>
        <input
          id="concept-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search across all 12 weeks"
          className="search-input"
          autoComplete="off"
        />
      </div>
      <div className="search-hint" aria-live="polite">
        {value.trim() ? `${resultCount} result${resultCount === 1 ? "" : "s"} found` : "Type a concept, skill, or pattern to jump straight to it."}
      </div>
    </div>
  );
}

function Highlight({ text, query }) {
  const parts = highlightText(text, query);
  if (typeof parts === "string") return parts;

  return (
    <>
      {parts.before}
      <mark className="fxj-mark">{parts.match}</mark>
      {parts.after}
    </>
  );
}

export function SearchResults({ query, results, onSelect }) {
  if (!query.trim()) return null;

  return (
    <section className="panel panel--stack search-results">
      <div className="section-head">
        <div>
          <div className="section-kicker">SEARCH MATCHES</div>
          <h2>Concept rows across all weeks</h2>
        </div>
        <p className="section-note">Click a result to open the right week and scroll to the matching concept.</p>
      </div>
      {results.length === 0 ? (
        <div className="empty-state">
          <p>No matches yet. Try searching for a candle type, a pattern, or a risk concept.</p>
        </div>
      ) : (
        <div className="search-results__grid">
          {results.map((result) => (
            <button
              key={`${result.weekId}-${result.conceptIndex}`}
              type="button"
              className="search-result"
              onClick={() => onSelect(result)}
            >
              <div className="search-result__meta">
                <span className="week-pill" style={{ "--phase-color": result.phaseColor }}>
                  W{result.week}
                </span>
                <span className="search-result__phase">{result.phaseName}</span>
              </div>
              <div className="search-result__concept">
                <Highlight text={result.concept} query={query} />
              </div>
              <div className="search-result__sub">{result.weekTitle}</div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function ThemeToggle({ theme, onToggle }) {
  const isLight = theme === "light";
  const nextTheme = isLight ? "dark" : "white";
  const stateLabel = isLight ? "White" : "Dark";

  return (
    <button
      type="button"
      className={joinClassNames("theme-toggle", isLight && "theme-toggle--light")}
      onClick={onToggle}
      aria-label={`Switch to ${nextTheme} theme`}
      aria-pressed={isLight}
      title={`Switch to ${nextTheme} theme`}
    >
      <span className="theme-toggle__copy">
        <span className="theme-toggle__eyebrow">Appearance</span>
        <span className="theme-toggle__state">{stateLabel}</span>
      </span>
      <span className="theme-toggle__rail" aria-hidden="true">
        <span className="theme-toggle__thumb" />
      </span>
    </button>
  );
}

export function PhaseSelector({ phases, activePhaseId, onSelect }) {
  return (
    <div className="phase-selector" role="tablist" aria-label="Phase selector">
      {phases.map((phase) => {
        const active = phase.id === activePhaseId;
        return (
          <button
            key={phase.id}
            type="button"
            className={joinClassNames("phase-chip", active && "phase-chip--active")}
            style={{
              "--phase-color": phase.color,
              "--phase-glow": phase.glow,
            }}
            onClick={() => onSelect(phase.id)}
            role="tab"
            aria-selected={active}
          >
            <span className="phase-chip__name">{phase.name}</span>
            <span className="phase-chip__sub">{phase.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FooterBar() {
  return (
    <footer className="footer">
      <div className="footer__quote">"Success is for those who are doing, not those who know about it."</div>
      <div className="footer__meta">MUIZ · FX JOURNEY · 12 WEEKS TO THE EDGE</div>
    </footer>
  );
}
