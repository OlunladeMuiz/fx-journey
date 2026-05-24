import React from "react";
import { joinClassNames } from "../lib/ui";

export function JournalDrawer({ open, week, draft, onClose, onDraftChange, onSubmit, recentEntries }) {
  if (!open || !week) return null;
  const visibleEntries = recentEntries.slice(0, 3);
  const hiddenEntryCount = Math.max(0, recentEntries.length - visibleEntries.length);

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="journal-drawer" role="dialog" aria-modal="true" aria-label="Journal drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <div className="section-kicker">JOURNAL DRAWER</div>
            <h3>{week.title}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close journal drawer">
            ×
          </button>
        </div>

        <form className="journal-form" onSubmit={onSubmit}>
          <section className="journal-form__section">
            <div className="journal-form__section-head">
              <div>
                <div className="section-kicker">ENTRY DETAILS</div>
                <h4>Name the pattern and state the outcome</h4>
              </div>
              <p className="journal-form__section-note">Keep this block short so the observation stays the main event.</p>
            </div>

            <div className="journal-form__grid">
              <label className="field field--span-8">
                <span>Pattern found</span>
                <input
                  type="text"
                  value={draft.patternFound}
                  onChange={(event) => onDraftChange("patternFound", event.target.value)}
                  placeholder="Bullish engulfing at support"
                />
              </label>

              <label className="field field--span-4">
                <span>Outcome</span>
                <select
                  className="form-select form-select--compact"
                  value={draft.outcome}
                  onChange={(event) => onDraftChange("outcome", event.target.value)}
                >
                  <option value="pending">PENDING</option>
                  <option value="correct">CORRECT</option>
                  <option value="incorrect">INCORRECT</option>
                </select>
              </label>

              <label className="field field--span-12">
                <span>Image URL</span>
                <input
                  type="text"
                  value={draft.imageUrl}
                  onChange={(event) => onDraftChange("imageUrl", event.target.value)}
                  placeholder="Optional chart image link"
                />
              </label>
            </div>
          </section>

          <section className="journal-form__section">
            <div className="journal-form__section-head">
              <div>
                <div className="section-kicker">OBSERVATION</div>
                <h4>Write the chart note</h4>
              </div>
              <p className="journal-form__section-note">One sharp observation beats three vague paragraphs.</p>
            </div>

            <div className="journal-form__grid">
              <label className="field field--span-12">
                <span>Chart note</span>
                <textarea
                  rows={5}
                  maxLength={200}
                  value={draft.chartNote}
                  onChange={(event) => onDraftChange("chartNote", event.target.value.slice(0, 200))}
                  placeholder="What did price do, what did the candle mean, and what did you learn?"
                />
                <small>{draft.chartNote.length}/200</small>
              </label>
            </div>
          </section>

          <div className="journal-form__footer">
            <div className="journal-date">Date: {draft.date}</div>
            <button type="submit" className="action-button action-button--secondary">
              SAVE ENTRY
            </button>
          </div>
        </form>

        <div className="journal-history">
          <div className="journal-history__head">
            <div>
              <div className="section-kicker">RECENT ENTRIES</div>
              <h4>{recentEntries.length === 0 ? "Nothing logged yet" : `Latest ${visibleEntries.length} of ${recentEntries.length}`}</h4>
            </div>
            {hiddenEntryCount > 0 ? <span className="journal-history__note">+{hiddenEntryCount} more in history</span> : null}
          </div>
          {recentEntries.length === 0 ? (
            <div className="empty-inline">Nothing logged yet. Use one clean chart note and keep it short and honest.</div>
          ) : (
            visibleEntries.map((entry) => (
              <article key={entry.id} className="journal-card">
                <div className="journal-card__top">
                  <strong>{entry.patternFound || "Pattern not named"}</strong>
                  <span className={joinClassNames("journal-outcome", `journal-outcome--${entry.outcome}`)}>
                    {String(entry.outcome || "pending").toUpperCase()}
                  </span>
                </div>
                <p>{entry.chartNote}</p>
                <div className="journal-card__meta">
                  <span>{entry.date}</span>
                  {entry.imageUrl ? <span>Image linked</span> : <span>No image</span>}
                </div>
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

export function QuizModal({ state, onClose, onSelectOption, onNext, onRetry }) {
  if (!state.open) return null;
  const question = state.questions[state.index];

  return (
    <div className="quiz-backdrop" role="presentation" onClick={onClose}>
        <div className="quiz-modal" role="dialog" aria-modal="true" aria-label="Weekly quiz" onClick={(event) => event.stopPropagation()}>
        <div className="quiz-modal__head">
          <div>
            <div className="section-kicker">AI QUIZ</div>
            <h3>{state.week?.title || "Weekly knowledge check"}</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close quiz modal">
            ×
          </button>
        </div>

        {state.loading ? (
          <div className="quiz-loading">
            <div className="loading-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p>Crafting quiz questions from the week concepts...</p>
          </div>
        ) : state.completed ? (
          <div className="quiz-result">
            <div className="quiz-result__score">
              <span>{state.score}</span>
              <small>/{state.total}</small>
            </div>
            <p className="quiz-result__message">{state.motivation}</p>
            <button type="button" className="action-button" onClick={onClose}>
              CLOSE
            </button>
          </div>
        ) : state.questions.length > 0 && question ? (
          <div className="quiz-body">
            {state.error ? <div className="coach-banner coach-banner--error">{state.error}</div> : null}
            <div className="quiz-progress">
              <span>
                Q {state.index + 1}/{state.total}
              </span>
              <span className="quiz-progress__score">
                Score {state.score}/{state.total}
              </span>
            </div>

            <div className="quiz-question">
              <p>{question.question}</p>
            </div>

            <div className="quiz-options">
              {question.options.map((option, optionIndex) => {
                const letter = String.fromCharCode(65 + optionIndex);
                const isSelected = state.selectedLetter === letter;
                const isCorrect = question.answer.toUpperCase() === letter;
                const statusClass = state.locked
                  ? isCorrect
                    ? "quiz-option--correct"
                    : isSelected
                    ? "quiz-option--wrong"
                    : ""
                  : "";

                return (
                  <button
                    key={option}
                    type="button"
                    className={joinClassNames("quiz-option", statusClass)}
                    onClick={() => onSelectOption(letter)}
                    disabled={state.locked}
                  >
                    <span className="quiz-option__letter">{letter}</span>
                    <span className="quiz-option__text">{option.replace(/^[A-D]\.\s*/, "")}</span>
                    {state.locked && isCorrect ? <span className="quiz-option__tick">✓</span> : null}
                  </button>
                );
              })}
            </div>

            <div className="quiz-footer">
              <div className={joinClassNames("quiz-feedback", state.locked && (state.lastCorrect ? "quiz-feedback--correct" : "quiz-feedback--wrong"))}>
                {state.locked
                  ? state.lastCorrect
                    ? "Correct. Keep the reasoning clean."
                    : `Wrong. Correct answer: ${state.correctLetter}`
                  : "Choose one answer, then move to the next question."}
              </div>
              <button type="button" className="action-button action-button--secondary" onClick={onNext} disabled={!state.locked}>
                {state.index + 1 === state.total ? "FINISH" : "NEXT"}
              </button>
            </div>
          </div>
        ) : state.error ? (
          <div className="quiz-error">
            <p>{state.error}</p>
            <button type="button" className="action-button action-button--secondary" onClick={onRetry}>
              TRY AGAIN
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CoachDrawer({
  open,
  messages,
  input,
  onInputChange,
  onSend,
  onClose,
  loading,
  notice,
  resetNotice,
  contextSummary,
  threadRef,
}) {
  if (!open) return null;

  return (
    <aside className="coach-drawer" aria-label="AI Coach">
      <div className="coach-drawer__head">
        <div>
          <div className="section-kicker">AI COACH</div>
          <h3>Ask about the chart, the rule, or the next rep.</h3>
          <div className="coach-summary">{contextSummary}</div>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close coach drawer">
          ×
        </button>
      </div>

      {resetNotice ? <div className="coach-banner">{resetNotice}</div> : null}
      {notice ? <div className="coach-banner coach-banner--error">{notice}</div> : null}

      <div className="coach-thread" role="log" aria-live="polite" ref={threadRef}>
        {messages.map((message) => (
          <div key={message.id} className={joinClassNames("coach-bubble", `coach-bubble--${message.role}`)}>
            {message.content}
          </div>
        ))}
        {loading ? (
          <div className="coach-bubble coach-bubble--assistant">
            <span className="loading-dots loading-dots--inline" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </div>
        ) : null}
      </div>

      <form className="coach-input" onSubmit={onSend}>
        <input
          type="text"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder="Ask the coach..."
        />
        <button type="submit" className="action-button action-button--secondary">
          SEND
        </button>
      </form>
    </aside>
  );
}

export function CoachLauncher({ onClick }) {
  return (
    <button type="button" className="coach-launcher pulse" onClick={onClick} aria-label="Ask coach" title="Ask coach">
      <span className="coach-launcher__glow" />
      <span className="coach-launcher__icon">⚡</span>
      <span className="coach-launcher__label">ASK COACH</span>
    </button>
  );
}
