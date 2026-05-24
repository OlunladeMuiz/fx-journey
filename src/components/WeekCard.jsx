import React from "react";
import { PAIR_OPTIONS } from "../data/curriculum";
import { conceptKey } from "../lib/progress";
import { calculateTradeMetrics, formatDecimal, formatPips, tradeStatsForWeek } from "../lib/trades";
import { highlightText, joinClassNames } from "../lib/ui";

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

export default function WeekCard({
  week,
  progress,
  isOpen,
  onToggleOpen,
  completedMap,
  onToggleConcept,
  onToggleWeek,
  query,
  score,
  onStartQuiz,
  tradeDraft,
  onTradeDraftChange,
  onTradeSubmit,
  trades,
  onTradeOutcomeChange,
  onOpenJournal,
  registerConceptRef,
  onOpenWeek,
  showTradeLog = true,
}) {
  const isComplete = progress === 100;
  const visibleConcepts = week.concepts.filter((concept) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return concept.toLowerCase().includes(needle);
  });
  const visibleTrades = trades.slice(0, 3);
  const hiddenTradeCount = Math.max(0, trades.length - visibleTrades.length);

  return (
    <article
      className={joinClassNames("week-card", isComplete && "week-card--complete", !showTradeLog && "week-card--detail")}
      style={{
        "--phase-color": week.phaseColor,
        "--phase-glow": week.phaseGlow,
      }}
    >
      <header className="week-card__header">
        <div className="week-card__heading">
          <div className="week-badge">
            <span>W{week.week}</span>
          </div>
          <div className="week-card__title-block">
            <div className="week-card__title-row">
              <h3>{week.title}</h3>
              {score != null ? <span className="quiz-badge">QUIZ {score}/5</span> : null}
              {onOpenWeek ? (
                <button type="button" className="text-button week-card__detail-button" onClick={() => onOpenWeek(week)}>
                  OPEN WEEK
                </button>
              ) : null}
            </div>
            <div className="week-card__meta">
              <span>{week.pages}</span>
              <span>-</span>
              <span>{week.phaseSubtitle}</span>
            </div>
          </div>
        </div>

        <button
          id={`week-card-toggle-${week.id}`}
          type="button"
          className="week-card__toggle"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          aria-controls={`week-card-body-${week.id}`}
          aria-label={`${isOpen ? "Collapse" : "Expand"} week ${week.week}: ${week.title}`}
          title={`${isOpen ? "Collapse" : "Expand"} week ${week.week}: ${week.title}`}
        >
          <span className="week-card__toggle-label">{isOpen ? "COLLAPSE" : "EXPAND"}</span>
          <span className={joinClassNames("week-card__toggle-icon", isOpen && "week-card__toggle-icon--open")} aria-hidden="true">
            <svg viewBox="0 0 24 24" role="presentation" focusable="false">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </button>

        <div className="week-progress">
          <div className="week-progress__bar">
            <div className="week-progress__fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{progress}%</span>
        </div>
      </header>

      <div
        id={`week-card-body-${week.id}`}
        className="week-card__body"
        aria-hidden={!isOpen}
        inert={isOpen ? undefined : ""}
        role="region"
        aria-labelledby={`week-card-toggle-${week.id}`}
      >
        <div className="week-card__body-inner">
          <div className="week-mission">
            <div className="week-mission__label">MISSION</div>
            <p>{week.mission}</p>
          </div>

          <div className="concept-panel">
            <div className="concept-panel__head">
              <h4>Concepts</h4>
              <button type="button" className="text-button" onClick={() => onToggleWeek(week)}>
                {progress === 100 ? "UNMARK ALL" : "MARK ALL"}
              </button>
            </div>

            <div className="concept-list">
              {visibleConcepts.length === 0 ? (
                <div className="empty-inline">No matching concepts in this week. Try a wider search or clear the filter.</div>
              ) : (
                visibleConcepts.map((concept) => {
                  const originalIndex = week.concepts.findIndex((value) => value === concept);
                  const key = conceptKey(week.id, originalIndex);
                  const checked = Boolean(completedMap[key]);

                  return (
                    <label
                      key={key}
                      className={joinClassNames("concept-row", checked && "concept-row--done")}
                      ref={(node) => {
                        if (node) registerConceptRef(key, node);
                      }}
                    >
                      <input type="checkbox" checked={checked} onChange={() => onToggleConcept(week.id, originalIndex)} />
                      <span className="concept-row__index">0{originalIndex + 1}</span>
                      <span className="concept-row__text">
                        <Highlight text={concept} query={query} />
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="task-callout">
            <div className="task-callout__label">LIVE TASK</div>
            <p>{week.doTask}</p>
          </div>

          <div className="week-actions">
            <button type="button" className="action-button action-button--secondary" onClick={() => onOpenJournal(week)}>
              OPEN JOURNAL
            </button>
            <button
              type="button"
              className={joinClassNames("action-button", !isComplete && "action-button--disabled")}
              onClick={() => isComplete && onStartQuiz(week)}
              disabled={!isComplete}
            >
              TEST MY KNOWLEDGE
            </button>
          </div>

          {showTradeLog ? (
          <section className="trade-log">
            <div className="trade-log__head">
              <div>
                <div className="section-kicker">TRADE JOURNAL</div>
                <h4>Log the live setup</h4>
              </div>
              <div className="trade-log__stats">
                {tradeStatsForWeek(trades, week.id).map((item) => (
                  <div key={item.label} className="trade-stat">
                    <span className="trade-stat__label">{item.label}</span>
                    <strong className="trade-stat__value">{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>

            <form className="trade-form" onSubmit={(event) => onTradeSubmit(event, week)}>
              <section className="trade-form__section">
                <div className="trade-form__section-head">
                  <div>
                    <div className="section-kicker">MARKET PLAN</div>
                    <h4>Setup the entry</h4>
                  </div>
                  <p className="trade-form__section-note">Keep this block fast. You should know the pair, direction, and entry in one glance.</p>
                </div>

                <div className="trade-form__grid">
                  <label className="field field--span-4">
                    <span>Pair</span>
                    <select
                      className="form-select"
                      value={tradeDraft.pair}
                      onChange={(event) => onTradeDraftChange(week.id, "pair", event.target.value)}
                    >
                      {PAIR_OPTIONS.map((pair) => (
                        <option key={pair} value={pair}>
                          {pair}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="field field--span-4 field--direction">
                    <span>Direction</span>
                    <div className="toggle-row">
                      {["BUY", "SELL"].map((direction) => (
                        <button
                          key={direction}
                          type="button"
                          className={joinClassNames("toggle-chip", tradeDraft.direction === direction && "toggle-chip--active")}
                          onClick={() => onTradeDraftChange(week.id, "direction", direction)}
                        >
                          {direction}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="field field--span-4">
                    <span>Entry</span>
                    <input
                      type="number"
                      step="any"
                      value={tradeDraft.entry}
                      onChange={(event) => onTradeDraftChange(week.id, "entry", event.target.value)}
                      placeholder="0.0000"
                    />
                  </label>
                </div>
              </section>

              <section className="trade-form__section">
                <div className="trade-form__section-head">
                  <div>
                    <div className="section-kicker">RISK PLAN</div>
                    <h4>Define the payoff</h4>
                  </div>
                  <p className="trade-form__section-note">The stop, target, and outcome should stay visually grouped so the risk picture feels immediate.</p>
                </div>

                <div className="trade-form__grid">
                  <label className="field field--span-4">
                    <span>Stop Loss</span>
                    <input
                      type="number"
                      step="any"
                      value={tradeDraft.sl}
                      onChange={(event) => onTradeDraftChange(week.id, "sl", event.target.value)}
                      placeholder="0.0000"
                    />
                  </label>

                  <label className="field field--span-4">
                    <span>Take Profit</span>
                    <input
                      type="number"
                      step="any"
                      value={tradeDraft.tp}
                      onChange={(event) => onTradeDraftChange(week.id, "tp", event.target.value)}
                      placeholder="0.0000"
                    />
                  </label>

                  <label className="field field--span-4 field--outcome">
                    <span>Outcome</span>
                    <select
                      className="form-select form-select--compact"
                      value={tradeDraft.outcome}
                      onChange={(event) => onTradeDraftChange(week.id, "outcome", event.target.value)}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="WIN">WIN</option>
                      <option value="LOSS">LOSS</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="trade-form__section">
                <div className="trade-form__section-head">
                  <div>
                    <div className="section-kicker">TRADE CONTEXT</div>
                    <h4>Why this setup matters</h4>
                  </div>
                  <p className="trade-form__section-note">Use this space for the pattern and the lesson, not a full essay.</p>
                </div>

                <div className="trade-form__grid">
                  <label className="field field--span-8">
                    <span>Pattern used</span>
                    <input
                      type="text"
                      value={tradeDraft.pattern}
                      onChange={(event) => onTradeDraftChange(week.id, "pattern", event.target.value)}
                      placeholder={week.title}
                    />
                  </label>

                  <label className="field field--span-12 field--notes">
                    <span>Notes</span>
                    <textarea
                      value={tradeDraft.notes}
                      onChange={(event) => onTradeDraftChange(week.id, "notes", event.target.value.slice(0, 200))}
                      maxLength={200}
                      rows={3}
                      placeholder="Why did you take it, what did the candle say, and what will you do differently next time?"
                    />
                    <small>{tradeDraft.notes.length}/200</small>
                  </label>
                </div>
              </section>

              <div className="trade-preview">
                <div className="trade-preview__metric">
                  <span>Estimated RR</span>
                  <strong>{formatDecimal(calculateTradeMetrics(tradeDraft).rr, 2)}R</strong>
                </div>
                <button type="submit" className="action-button action-button--secondary">
                  SAVE TRADE
                </button>
              </div>
            </form>

            <div className="trade-rows">
              <div className="trade-rows__head">
                <div>
                  <div className="section-kicker">RECENT TRADES</div>
                  <h4>{trades.length === 0 ? "Nothing logged yet" : `Latest ${visibleTrades.length} of ${trades.length}`}</h4>
                </div>
                {hiddenTradeCount > 0 ? <span className="trade-rows__note">+{hiddenTradeCount} more in history</span> : null}
              </div>
              {trades.length === 0 ? (
                <div className="empty-inline">No trades logged here yet. The first live rep will unlock the pattern.</div>
              ) : (
                visibleTrades.map((trade) => {
                  const metrics = calculateTradeMetrics(trade);
                  const outcome = trade.outcome || "OPEN";
                  const className = joinClassNames(
                    "trade-row",
                    outcome === "WIN" && "trade-row--win",
                    outcome === "LOSS" && "trade-row--loss"
                  );

                  return (
                    <div key={trade.id} className={className}>
                      <div className="trade-row__main">
                        <div className="trade-row__topline">
                          <strong>{trade.pair}</strong>
                          <span className={joinClassNames("outcome-pill", `outcome-pill--${outcome.toLowerCase()}`)}>{outcome}</span>
                        </div>
                        <div className="trade-row__meta">
                          <span>{trade.direction}</span>
                          <span>Entry {trade.entry || "—"}</span>
                          <span>SL {trade.sl || "—"}</span>
                          <span>TP {trade.tp || "—"}</span>
                        </div>
                        <div className="trade-row__notes">
                          {trade.pattern ? `${trade.pattern} · ` : ""}
                          {trade.notes || "No notes added yet."}
                        </div>
                      </div>
                      <div className="trade-row__side">
                        <div className={joinClassNames("trade-row__pips", outcome === "LOSS" && "trade-row__pips--loss")}>
                          {formatPips(metrics.pips)}
                        </div>
                        <div className="trade-row__rr">RR {formatDecimal(metrics.rr, 2)}</div>
                        <select
                          className="trade-row__outcome form-select form-select--compact"
                          value={outcome}
                          onChange={(event) => onTradeOutcomeChange(trade.id, event.target.value)}
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="WIN">WIN</option>
                          <option value="LOSS">LOSS</option>
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
          ) : null}
        </div>
      </div>
    </article>
  );
}
