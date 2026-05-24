import React, { useState } from "react";
import Header from "./Header";
import { DailyLoopSection, IronRulesSection } from "./Sections";
import WeekCard from "./WeekCard";
import { SearchBar } from "./Chrome";
import { PAIR_OPTIONS, PHASES, WEEKS } from "../data/curriculum";
import { getContinueWeek, getWeekById, phaseProgress, weekProgress } from "../lib/progress";
import { calculateTradeMetrics, formatDecimal, formatPips } from "../lib/trades";
import { dateFromKey } from "../lib/date";
import { highlightText, joinClassNames } from "../lib/ui";
import { withQuery } from "../lib/router";

export function Breadcrumbs({ items, onNavigate }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs__list">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="breadcrumbs__item">
              {item.to && !last ? (
                <button type="button" className="breadcrumbs__link" onClick={() => onNavigate(item.to)}>
                  {item.label}
                </button>
              ) : (
                <span className={joinClassNames("breadcrumbs__current", last && "breadcrumbs__current--active")}>{item.label}</span>
              )}
              {!last ? <span className="breadcrumbs__sep">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const NAV_ITEMS = [
  { route: "dashboard", label: "Dashboard", path: "/" },
  { route: "learn", label: "Learn", path: "/phases" },
  { route: "journal", label: "Journal", path: "/journal" },
  { route: "patterns", label: "Patterns", path: "/patterns" },
];

const JOURNAL_OUTCOMES = ["OPEN", "WIN", "LOSS"];

function getWeekNavigationTargets(weekId) {
  const index = WEEKS.findIndex((item) => item.id === weekId);
  return {
    previousWeek: index > 0 ? WEEKS[index - 1] : null,
    nextWeek: index >= 0 && index < WEEKS.length - 1 ? WEEKS[index + 1] : null,
  };
}

function formatJournalFieldValue(value) {
  return value === "" || value == null ? "-" : value;
}

function matchesJournalEntry(entry, filters) {
  if (filters.weekId && entry.weekId !== filters.weekId) return false;
  if (filters.pair && entry.pair !== filters.pair) return false;
  if (filters.outcome && String(entry.outcome || "OPEN").toUpperCase() !== filters.outcome) return false;

  const needle = filters.query.trim().toLowerCase();
  if (!needle) return true;

  const week = getWeekById(entry.weekId);
  const haystack = [
    entry.pair,
    entry.setup,
    entry.pattern,
    entry.notes,
    entry.entry,
    entry.sl,
    entry.tp,
    entry.weekLabel,
    week?.title,
    week?.phaseName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

export function BottomNav({ route, onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = item.route === "learn" ? route === "phases" || route === "phase" || route === "week" : route === item.route;
        return (
          <button
            key={item.route}
            type="button"
            className={joinClassNames("bottom-nav__item", active && "bottom-nav__item--active")}
            onClick={() => onNavigate(item.path)}
          >
            <span className="bottom-nav__label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function PhaseSummaryCard({ phase, progress, onEnter }) {
  const phaseWeeks = phase.weeks || [];
  const firstWeek = phaseWeeks[0];
  const lastWeek = phaseWeeks[phaseWeeks.length - 1];

  return (
    <button
      type="button"
      className="phase-overview-card"
      onClick={() => onEnter(phase.id)}
      style={{
        "--phase-color": phase.color,
        "--phase-glow": phase.glow,
      }}
    >
      <div className="phase-overview-card__top">
        <div className="phase-overview-card__eyebrow">PHASE</div>
        <span className="week-pill" style={{ "--phase-color": phase.color }}>
          {phase.weeks.length} weeks
        </span>
      </div>
      <h3>{phase.name}</h3>
      <p className="phase-overview-card__subtitle">{phase.subtitle}</p>
      <div className="phase-overview-card__pages">
        {firstWeek && lastWeek ? `${firstWeek.week}-${lastWeek.week}` : "0-0"}
      </div>
      <div className="phase-overview-card__progress">
        <div className="week-progress__bar">
          <div className="week-progress__fill" style={{ width: `${progress.percent}%`, "--phase-color": phase.color }} />
        </div>
        <div className="phase-overview-card__progress-meta">
          <strong>{progress.percent}%</strong>
          <span>
            {progress.done}/{progress.total}
          </span>
        </div>
      </div>
      <span className="phase-overview-card__cta">Enter phase</span>
    </button>
  );
}

export function DashboardView({ activePhase, progressSummary, streak, currentWeek, continueWeek, onContinue, loadMessage }) {
  return (
    <main className="shell-shell dashboard-shell">
      <Breadcrumbs items={[{ label: "Dashboard" }]} onNavigate={() => {}} />
      <Header
        activePhase={activePhase}
        progressSummary={progressSummary}
        streak={streak}
        currentWeek={currentWeek}
        continueWeek={continueWeek}
        onContinue={onContinue}
        loadMessage={loadMessage}
      />
      <DailyLoopSection variant="strip" />
    </main>
  );
}

export function PhaseOverviewView({ phases, completedMap, onEnterPhase, onNavigate }) {
  return (
    <main className="shell-shell route-shell">
      <Breadcrumbs
        onNavigate={onNavigate}
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Phases" },
        ]}
      />

      <section className="panel panel--stack">
        <div className="section-head">
          <div>
            <div className="section-kicker">PHASES</div>
            <h2>Choose your route in the curriculum</h2>
          </div>
          <p className="section-note">Two books. Two phases. One clean progression from candle anatomy to advanced pattern work.</p>
        </div>

        <div className="phase-overview-grid">
          {phases.map((phase) => (
            <PhaseSummaryCard key={phase.id} phase={phase} progress={phaseProgress(phase.id, completedMap)} onEnter={onEnterPhase} />
          ))}
        </div>
      </section>
    </main>
  );
}

function SearchHighlight({ text, query }) {
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

export function PhaseView({
  phase,
  phases,
  visibleWeeks,
  completedMap,
  openWeeks,
  query,
  searchResults,
  activePhaseId,
  onNavigate,
  onPhaseSelect,
  onSearchChange,
  onToggleWeekOpen,
  onToggleConcept,
  onToggleWeek,
  onSearchSelect,
  onOpenJournal,
  onStartQuiz,
  tradeDrafts,
  trades,
  quizScores,
  registerConceptRef,
  onTradeDraftChange,
  onTradeSubmit,
  onTradeOutcomeChange,
}) {
  return (
    <main className="shell-shell route-shell">
      <Breadcrumbs
        onNavigate={onNavigate}
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Phases", to: "/phases" },
          { label: phase.name },
        ]}
      />

      <section className="panel panel--stack">
        <div className="section-head">
          <div>
            <div className="section-kicker">{phase.subtitle}</div>
            <h2>{phase.name}</h2>
          </div>
          <p className="section-note">Use the search bar to jump straight to a concept row across the selected phase.</p>
        </div>

        <div className="phase-summary-bar" style={{ "--phase-color": phase.color, "--phase-glow": phase.glow }}>
          <div className="phase-summary-bar__meta">
            <span>{visibleWeeks.length} weeks</span>
            <strong>{phase.title || phase.subtitle}</strong>
          </div>
          <div className="phase-summary-bar__progress">
            <span>{phaseProgress(phase.id, completedMap).percent}% complete</span>
          </div>
        </div>

        <div className="phase-selector-wrap">
          <div className="phase-selector" role="tablist" aria-label="Phase selector">
            {phases.map((item) => {
              const active = item.id === activePhaseId;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={joinClassNames("phase-chip", active && "phase-chip--active")}
                  style={{
                    "--phase-color": item.color,
                    "--phase-glow": item.glow,
                  }}
                  onClick={() => onPhaseSelect(item.id)}
                  role="tab"
                  aria-selected={active}
                >
                  <span className="phase-chip__name">{item.name}</span>
                  <span className="phase-chip__sub">{item.subtitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        <SearchBar value={query} onChange={onSearchChange} resultCount={searchResults.length} />
        <SearchResults query={query} results={searchResults} onSelect={onSearchSelect} />

        <div className="week-list">
          {visibleWeeks.map((week) => (
            <WeekCard
              key={week.id}
              week={week}
              progress={weekProgress(week.id, week.concepts, completedMap)}
              isOpen={Boolean(openWeeks[week.id])}
              onToggleOpen={() => onToggleWeekOpen(week.id)}
              completedMap={completedMap}
              onToggleConcept={onToggleConcept}
              onToggleWeek={onToggleWeek}
              query={query}
              score={quizScores[week.id]}
              onStartQuiz={onStartQuiz}
              tradeDraft={tradeDrafts[week.id]}
              onTradeDraftChange={onTradeDraftChange}
              onTradeSubmit={onTradeSubmit}
              trades={trades
                .filter((trade) => trade.weekId === week.id)
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))}
              onTradeOutcomeChange={onTradeOutcomeChange}
              onOpenJournal={onOpenJournal}
              onOpenWeek={(selectedWeek) => onNavigate(`/weeks/${selectedWeek.id}`)}
              registerConceptRef={registerConceptRef}
            />
          ))}
        </div>

        <IronRulesSection />
      </section>
    </main>
  );
}

function ConfidenceButtons({ value, onChange }) {
  return (
    <div className="confidence-buttons" role="group" aria-label="Pattern confidence">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          className={joinClassNames("confidence-pill", value === rating && "confidence-pill--active")}
          onClick={() => onChange(rating)}
        >
          {rating}
        </button>
      ))}
    </div>
  );
}

function WeekNavigator({ week, onNavigate }) {
  const { previousWeek, nextWeek } = getWeekNavigationTargets(week.id);

  return (
    <div className="week-nav" aria-label="Week navigation" style={{ "--phase-color": week.phaseColor, "--phase-glow": week.phaseGlow }}>
      <button
        type="button"
        className="week-nav__button week-nav__button--prev"
        onClick={() => previousWeek && onNavigate(`/weeks/${previousWeek.id}`)}
        disabled={!previousWeek}
        aria-label={previousWeek ? `Go to Week ${previousWeek.week}` : "Already at the first week"}
      >
        <span className="week-nav__eyebrow">Previous week</span>
        <strong>{previousWeek ? `Week ${previousWeek.week}` : "Start of the path"}</strong>
        <span>{previousWeek ? previousWeek.title : "No earlier week"}</span>
      </button>

      <div className="week-nav__center">
        <span className="week-nav__eyebrow">Current week</span>
        <strong>Week {week.week}</strong>
        <span>{week.phaseName}</span>
      </div>

      <button
        type="button"
        className="week-nav__button week-nav__button--next"
        onClick={() => nextWeek && onNavigate(`/weeks/${nextWeek.id}`)}
        disabled={!nextWeek}
        aria-label={nextWeek ? `Go to Week ${nextWeek.week}` : "Already at the last week"}
      >
        <span className="week-nav__eyebrow">Next week</span>
        <strong>{nextWeek ? `Week ${nextWeek.week}` : "Final week"}</strong>
        <span>{nextWeek ? nextWeek.title : "No later week"}</span>
      </button>
    </div>
  );
}

export function WeekDetailView({
  week,
  phase,
  completedMap,
  progress,
  score,
  query,
  tradeDraft,
  trades,
  quizScores,
  onToggleConcept,
  onToggleWeek,
  onStartQuiz,
  onOpenJournal,
  onTradeDraftChange,
  onTradeSubmit,
  onTradeOutcomeChange,
  registerConceptRef,
  onNavigate,
}) {
  if (!week) return null;

  return (
    <main className="shell-shell route-shell">
      <Breadcrumbs
        onNavigate={onNavigate}
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Phases", to: "/phases" },
          { label: phase?.name || "Phase", to: phase ? `/phases/${phase.id}` : "/phases" },
          { label: `Week ${week.week}` },
        ]}
      />

      <section className="panel panel--stack week-detail-shell">
        <WeekNavigator week={week} onNavigate={onNavigate} />

        <div className="week-detail-shell__hero">
          <div>
            <div className="section-kicker">{week.book}</div>
            <h2>
              Week {week.week}: {week.title}
            </h2>
            <p className="section-note">{week.mission}</p>
          </div>
          <div className="week-detail-shell__meta">
            <span className="week-pill" style={{ "--phase-color": week.phaseColor }}>
              {week.pages}
            </span>
            {score != null ? <span className="quiz-badge">QUIZ {score}/5</span> : null}
          </div>
        </div>

        <WeekCard
          week={week}
          progress={progress}
          isOpen
          onToggleOpen={() => {}}
          completedMap={completedMap}
          onToggleConcept={onToggleConcept}
          onToggleWeek={onToggleWeek}
          query={query}
          score={quizScores[week.id]}
          onStartQuiz={onStartQuiz}
          tradeDraft={tradeDraft}
          onTradeDraftChange={onTradeDraftChange}
          onTradeSubmit={onTradeSubmit}
          trades={trades}
          onTradeOutcomeChange={onTradeOutcomeChange}
          onOpenJournal={onOpenJournal}
          onOpenWeek={null}
          registerConceptRef={registerConceptRef}
          showTradeLog={false}
        />
      </section>
    </main>
  );
}

const JOURNAL_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

function formatJournalDate(value) {
  if (!value) return "Today";
  if (typeof value === "number") {
    const parsedNumber = new Date(value);
    if (!Number.isNaN(parsedNumber.getTime())) {
      return JOURNAL_DATE_FORMATTER.format(parsedNumber);
    }
  }

  const text = String(value);
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(text) ? dateFromKey(text) : new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return JOURNAL_DATE_FORMATTER.format(parsed);
}

function getJournalStats(entries) {
  const total = entries.length;
  const closed = entries.filter((entry) => ["WIN", "LOSS"].includes(String(entry.outcome || "OPEN").toUpperCase()));
  const wins = closed.filter((entry) => String(entry.outcome || "OPEN").toUpperCase() === "WIN").length;
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : null;
  const avgRR = total
    ? entries.reduce((sum, entry) => sum + calculateTradeMetrics(entry).rr, 0) / total
    : null;
  const open = entries.filter((entry) => String(entry.outcome || "OPEN").toUpperCase() === "OPEN").length;

  return { total, winRate, avgRR, open };
}

function JournalEntryCard({ entry, query = "" }) {
  const metrics = calculateTradeMetrics(entry);
  const week = getWeekById(entry.weekId);

  return (
    <article className="journal-entry-card">
      <div className="journal-entry-card__top">
        <div>
          <strong>
            <SearchHighlight text={entry.pair || "Pair not set"} query={query} />
          </strong>
          <p>
            <SearchHighlight text={entry.setup || entry.pattern || "No setup description"} query={query} />
          </p>
        </div>
        <span className={joinClassNames("outcome-pill", `outcome-pill--${String(entry.outcome || "OPEN").toLowerCase()}`)}>
          {String(entry.outcome || "OPEN").toUpperCase()}
        </span>
      </div>

      <div className="journal-entry-card__meta">
        <span>{week ? `Week ${week.week}` : entry.weekLabel || `Week ${entry.weekId || "-"}`}</span>
        <span>{formatJournalDate(entry.date || entry.createdAt)}</span>
        <span>Entry {formatJournalFieldValue(entry.entry)}</span>
        <span>SL {formatJournalFieldValue(entry.sl)}</span>
        <span>TP {formatJournalFieldValue(entry.tp)}</span>
      </div>

      <p className="journal-entry-card__notes">
        <SearchHighlight text={entry.notes || "No notes yet."} query={query} />
      </p>

      <div className="journal-entry-card__footer">
        <span>{formatPips(metrics.pips)}</span>
        <span>RR {formatDecimal(metrics.rr, 2)}R</span>
        {entry.screenshotUrl ? (
          <a href={entry.screenshotUrl} target="_blank" rel="noreferrer">
            Screenshot
          </a>
        ) : (
          <span>No screenshot</span>
        )}
      </div>
    </article>
  );
}

function JournalFiltersPanel({ filters, weekOptions, totalEntries, filteredEntries, onFilterChange, onClearFilters }) {
  const hasFilters = Boolean(filters.weekId || filters.pair || filters.outcome || filters.query.trim());

  return (
    <section className="journal-toolbar" aria-labelledby="journal-filters-title">
      <div className="journal-toolbar__head">
        <div>
          <div className="section-kicker">FILTERS</div>
          <h4 id="journal-filters-title">{hasFilters ? "Refine the journal" : "Scan the journal"}</h4>
        </div>
        <div className="journal-toolbar__summary" aria-live="polite">
          <strong>{filteredEntries.length}</strong>
          <span>{hasFilters ? `of ${totalEntries} entries` : "entries total"}</span>
        </div>
      </div>

      <div className="journal-filter-grid">
        <label className="field field--span-12">
          <span>Search</span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => onFilterChange("query", event.target.value)}
            placeholder="Pair, setup, notes, or week label"
          />
        </label>

        <label className="field field--span-4">
          <span>Week</span>
          <select className="form-select" value={filters.weekId} onChange={(event) => onFilterChange("weekId", event.target.value)}>
            <option value="">All weeks</option>
            {weekOptions.map((week) => (
              <option key={week.id} value={week.id}>
                W{week.week} - {week.title}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--span-4">
          <span>Pair</span>
          <select className="form-select" value={filters.pair} onChange={(event) => onFilterChange("pair", event.target.value)}>
            <option value="">All pairs</option>
            {PAIR_OPTIONS.map((pair) => (
              <option key={pair} value={pair}>
                {pair}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--span-4">
          <span>Result</span>
          <select className="form-select" value={filters.outcome} onChange={(event) => onFilterChange("outcome", event.target.value)}>
            <option value="">All outcomes</option>
            {JOURNAL_OUTCOMES.map((outcome) => (
              <option key={outcome} value={outcome}>
                {outcome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="journal-toolbar__footer">
        <p className="journal-toolbar__note">Search by chart notes, setup names, pair, result, or week label.</p>
        <button type="button" className="text-button journal-toolbar__clear" onClick={onClearFilters} disabled={!hasFilters}>
          Clear filters
        </button>
      </div>
    </section>
  );
}

function JournalForm({ draft, weekOptions, onDraftChange, onSubmit }) {
  return (
    <form className="journal-form journal-form--page" onSubmit={onSubmit}>
      <section className="journal-form__section">
        <div className="journal-form__section-head">
          <div>
            <div className="section-kicker">TRADE JOURNAL</div>
            <h4>Log the trade while the reasoning is still fresh</h4>
          </div>
          <p className="journal-form__section-note">Keep the record short, honest, and specific.</p>
        </div>

        <div className="journal-form__grid">
          <label className="field field--span-6">
            <span>Week</span>
            <select className="form-select" value={draft.weekId} onChange={(event) => onDraftChange("weekId", event.target.value)}>
              {weekOptions.map((week) => (
                <option key={week.id} value={week.id}>
                  W{week.week} - {week.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--span-6">
            <span>Pair</span>
            <select className="form-select" value={draft.pair} onChange={(event) => onDraftChange("pair", event.target.value)}>
              {PAIR_OPTIONS.map((pair) => (
                <option key={pair} value={pair}>
                  {pair}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--span-12">
            <span>Result</span>
            <select className="form-select form-select--compact" value={draft.outcome} onChange={(event) => onDraftChange("outcome", event.target.value)}>
              <option value="OPEN">OPEN</option>
              <option value="WIN">WIN</option>
              <option value="LOSS">LOSS</option>
            </select>
          </label>

          <label className="field field--span-12">
            <span>Setup</span>
            <input type="text" value={draft.setup} onChange={(event) => onDraftChange("setup", event.target.value)} placeholder="Pin bar at support" />
          </label>

          <label className="field field--span-6">
            <span>Entry</span>
            <input type="number" step="any" value={draft.entry} onChange={(event) => onDraftChange("entry", event.target.value)} placeholder="0.0000" />
          </label>

          <label className="field field--span-6">
            <span>Stop Loss</span>
            <input type="number" step="any" value={draft.sl} onChange={(event) => onDraftChange("sl", event.target.value)} placeholder="0.0000" />
          </label>

          <label className="field field--span-12">
            <span>Take Profit</span>
            <input type="number" step="any" value={draft.tp} onChange={(event) => onDraftChange("tp", event.target.value)} placeholder="0.0000" />
          </label>

          <label className="field field--span-12">
            <span>Screenshot URL</span>
            <input type="text" value={draft.screenshotUrl} onChange={(event) => onDraftChange("screenshotUrl", event.target.value)} placeholder="Optional chart image link" />
          </label>

          <label className="field field--span-12">
            <span>Notes</span>
            <textarea
              rows={4}
              maxLength={240}
              value={draft.notes}
              onChange={(event) => onDraftChange("notes", event.target.value.slice(0, 240))}
              placeholder="Why did you take it, what did the candle say, and what will you do differently next time?"
            />
            <small>{draft.notes.length}/240</small>
          </label>
        </div>
      </section>

      <div className="trade-preview">
        <div className="trade-preview__metric">
          <span>Estimated RR</span>
          <strong>{formatDecimal(calculateTradeMetrics(draft).rr, 2)}R</strong>
        </div>
        <button type="submit" className="action-button action-button--secondary">
          SAVE ENTRY
        </button>
      </div>
    </form>
  );
}

export function JournalView({
  entries,
  draft,
  weekOptions,
  onDraftChange,
  onSubmit,
  onNavigate,
  selectedWeekId,
  queryParams,
}) {
  const journalParams = queryParams || new URLSearchParams();
  const filters = {
    weekId: journalParams.get("week") || selectedWeekId || "",
    pair: journalParams.get("pair") || "",
    outcome: journalParams.get("outcome") || "",
    query: journalParams.get("q") || "",
  };
  const visibleEntries = entries.filter((entry) => matchesJournalEntry(entry, filters));
  const activeWeek = filters.weekId ? getWeekById(filters.weekId) : null;
  const hasFilters = Boolean(filters.weekId || filters.pair || filters.outcome || filters.query.trim());
  const journalStats = getJournalStats(visibleEntries);

  function updateFilters(nextFilters, options = {}) {
    onNavigate(withQuery("/journal", nextFilters), options);
  }

  function updateFilter(field, value) {
    const nextFilters = {
      week: field === "weekId" ? value : filters.weekId,
      pair: field === "pair" ? value : filters.pair,
      outcome: field === "outcome" ? value : filters.outcome,
      q: field === "query" ? value : filters.query,
    };

    updateFilters(nextFilters, field === "query" ? { replace: true } : {});
  }

  return (
    <main className="shell-shell route-shell">
      <Breadcrumbs
        onNavigate={onNavigate}
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Journal" },
        ]}
      />

      <section className="panel panel--stack journal-panel">
        <div className="section-head">
          <div>
            <div className="section-kicker">JOURNAL</div>
            <h2>{activeWeek ? `Trade journal for Week ${activeWeek.week}` : "Trade journal"}</h2>
          </div>
          <p className="section-note">Record the setup, the risk, the result, and what the chart actually told you.</p>
        </div>

        <div className="journal-summary-grid" aria-label="Journal summary">
          <article className="journal-summary-card">
            <span className="journal-summary-card__label">Logged</span>
            <strong>{entries.length}</strong>
            <p>Total saved entries</p>
          </article>
          <article className="journal-summary-card">
            <span className="journal-summary-card__label">Visible</span>
            <strong>{visibleEntries.length}</strong>
            <p>{hasFilters ? "Matches current filters" : "All entries in view"}</p>
          </article>
          <article className="journal-summary-card">
            <span className="journal-summary-card__label">Win rate</span>
            <strong>{journalStats.winRate == null ? "-" : `${journalStats.winRate}%`}</strong>
            <p>Across closed trades</p>
          </article>
          <article className="journal-summary-card">
            <span className="journal-summary-card__label">Avg RR</span>
            <strong>{journalStats.avgRR == null ? "-" : `${formatDecimal(journalStats.avgRR, 2)}R`}</strong>
            <p>{journalStats.open} open entries</p>
          </article>
        </div>

        <div className="journal-layout">
          <aside className="journal-layout__rail">
            <JournalForm draft={draft} weekOptions={weekOptions} onDraftChange={onDraftChange} onSubmit={onSubmit} />

            <JournalFiltersPanel
              filters={filters}
              weekOptions={weekOptions}
              totalEntries={entries.length}
              filteredEntries={visibleEntries}
              onFilterChange={updateFilter}
              onClearFilters={() => updateFilters({})}
            />
          </aside>

          <div className="journal-layout__content">
            <div className="journal-history journal-history--page">
              <div className="journal-history__head">
                <div>
                  <div className="section-kicker">ENTRY LOG</div>
                  <h4>
                    {visibleEntries.length === 0
                      ? hasFilters
                        ? "No matching entries"
                        : "Nothing logged yet"
                      : `${visibleEntries.length} entries, newest first`}
                  </h4>
                </div>
                {hasFilters ? (
                  <span className="journal-history__note">
                    {activeWeek ? `Week ${activeWeek.week}` : "All weeks"} {filters.pair || filters.outcome || filters.query ? "filtered" : "selected"}
                  </span>
                ) : (
                  <span className="journal-history__note">Newest entries stay at the top.</span>
                )}
              </div>

              {visibleEntries.length === 0 ? (
                <div className="empty-inline">
                  {hasFilters
                    ? "No journal entries match these filters yet. Clear one filter or widen the search."
                    : "Nothing logged yet. Use one clean chart note and keep it short and honest."}
                </div>
              ) : (
                <div className="journal-entry-list">
                  {visibleEntries.map((entry) => (
                    <JournalEntryCard key={entry.id} entry={entry} query={filters.query} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PatternItem({ item, confidence, onChange, query }) {
  return (
    <article className="pattern-item">
      <div className="pattern-item__head">
        <div>
          <span className="week-pill" style={{ "--phase-color": item.phaseColor }}>
            W{item.week}
          </span>
          <div className="pattern-item__title">
            <SearchHighlight text={item.concept} query={query} />
          </div>
        </div>
        <div className="pattern-item__meta">
          <span>{item.phaseName}</span>
          <span>{item.pages}</span>
        </div>
      </div>
      <ConfidenceButtons value={confidence} onChange={onChange} />
    </article>
  );
}

export function PatternLibraryView({ patterns, confidenceMap, onConfidenceChange, onNavigate }) {
  const [query, setQuery] = useState("");
  const queryValue = query.trim();

  const grouped = PHASES.flatMap((phase) =>
    phase.weeks.map((week) => {
      const items = patterns.filter((item) => item.weekId === week.id);
      const filteredItems = queryValue
        ? items.filter((item) => item.concept.toLowerCase().includes(queryValue.toLowerCase()))
        : items;
      return {
        phase,
        week,
        patterns: filteredItems,
      };
    })
  ).filter(({ patterns: items }) => items.length > 0);
  const visiblePatternCount = grouped.reduce((acc, group) => acc + group.patterns.length, 0);

  return (
    <main className="shell-shell route-shell">
      <Breadcrumbs
        onNavigate={onNavigate}
        items={[
          { label: "Dashboard", to: "/" },
          { label: "Patterns" },
        ]}
      />

      <section className="panel panel--stack">
        <div className="section-head">
          <div>
            <div className="section-kicker">PATTERN LIBRARY</div>
            <h2>Rate your confidence across every pattern in both books</h2>
          </div>
          <p className="section-note">The confidence number is a backlog tool, not a score. Use it to spot what still needs reps.</p>
        </div>

        <div className="pattern-library__search">
          <label className="search-label" htmlFor="pattern-search">
            Search patterns
          </label>
          <input
            id="pattern-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the master list"
            className="search-input"
            autoComplete="off"
          />
        </div>

        <div className="pattern-library__summary" aria-live="polite">
          <strong>{visiblePatternCount}</strong>
          <span>{queryValue ? `matches across ${grouped.length} weeks` : "patterns across the full curriculum"}</span>
        </div>

        {grouped.length === 0 ? (
          <div className="empty-inline">No patterns match this search. Try a broader term or clear the filter.</div>
        ) : (
          <div className="pattern-library__grid">
            {grouped.map(({ phase, week, patterns: items }) => (
              <article key={week.id} className="pattern-week-card" style={{ "--phase-color": phase.color, "--phase-glow": phase.glow }}>
                <div className="pattern-week-card__head">
                  <div>
                    <div className="section-kicker">{phase.name}</div>
                    <h3>
                      Week {week.week}: {week.title}
                    </h3>
                  </div>
                  <span className="week-pill" style={{ "--phase-color": phase.color }}>
                    {week.pages}
                  </span>
                </div>

                <div className="pattern-item-list">
                  {items.map((item) => (
                    <PatternItem
                      key={item.id}
                      item={item}
                      confidence={confidenceMap[item.id] || 1}
                      query={queryValue}
                      onChange={(value) => onConfidenceChange(item.id, value)}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export function buildPatternStats(patterns, confidenceMap) {
  const total = patterns.length;
  const sum = patterns.reduce((acc, item) => acc + (confidenceMap[item.id] || 1), 0);
  const average = total ? sum / total : 0;
  const strong = patterns.filter((item) => (confidenceMap[item.id] || 1) >= 4).length;
  return { total, average, strong };
}

export function getPhaseForWeek(weekId) {
  return PHASES.find((phase) => phase.weeks.some((week) => week.id === weekId)) || null;
}

export function getWeekLabel(weekId) {
  const week = getWeekById(weekId);
  return week ? `Week ${week.week}` : "Unknown week";
}

export function getContinueTarget(completedMap) {
  return getContinueWeek(completedMap);
}
