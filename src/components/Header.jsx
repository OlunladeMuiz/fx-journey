import React from "react";
import { OverallProgress, StreakBadge } from "./Chrome";

export default function Header({ activePhase, progressSummary, streak, currentWeek, continueWeek, onContinue, loadMessage }) {
  return (
    <section className="hero panel">
      <div className="hero__copy">
        <div className="section-kicker">CURRENT ROUTE</div>
        <h1>FX Journey</h1>
        <p className="hero__lead">
          A 12-week forex learning tracker built to make active chart work louder than passive reading.
        </p>
        <div className="hero__badges">
          <span className="hero-badge hero-badge--accent" style={{ "--phase-color": activePhase.color }}>
            {activePhase.name}
          </span>
          <span className="hero-badge">Adaptive themes</span>
          <span className="hero-badge">Persistent storage</span>
          <span className="hero-badge">AI coach</span>
        </div>
        {continueWeek && onContinue ? (
          <div className="hero__cta-row">
            <button type="button" className="action-button" onClick={onContinue}>
              Continue Week {continueWeek.week}
            </button>
            <span className="hero__cta-copy">Jump straight back into the next unfinished week.</span>
          </div>
        ) : null}
        {loadMessage ? <div className="hero__notice">{loadMessage}</div> : null}
      </div>

      <div className="hero__metrics">
        <OverallProgress
          percent={progressSummary.percent}
          done={progressSummary.done}
          total={progressSummary.total}
          accent={activePhase.color}
        />
        <div className="hero__metric-stack">
          <StreakBadge streak={streak} />
          <div className="metric-card">
            <span>Current focus</span>
            <strong>
              Week {currentWeek.week}: {currentWeek.title}
            </strong>
          </div>
          <div className="metric-card">
            <span>Completed concepts</span>
            <strong>
              {progressSummary.done}/{progressSummary.total}
            </strong>
          </div>
        </div>
      </div>
    </section>
  );
}
