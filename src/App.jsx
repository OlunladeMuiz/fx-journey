import React, { useEffect, useRef, useState } from "react";
import { CoachDrawer, CoachLauncher, JournalDrawer, QuizModal } from "./components/Overlays";
import Header from "./components/Header";
import { FooterBar, PhaseSelector, SearchBar, SearchResults, SplashScreen, TickerBar } from "./components/Chrome";
import { DailyLoopSection, IronRulesSection } from "./components/Sections";
import WeekCard from "./components/WeekCard";
import { PHASES, STORAGE_KEYS, TICKER_ITEMS, WEEKS } from "./data/curriculum";
import { dateKey } from "./lib/date";
import { conceptKey, getCurrentWeekLabel, getRecentCompletedConcepts, totalProgress, weekProgress } from "./lib/progress";
import { calculateTradeMetrics, toNumber } from "./lib/trades";
import { createFallbackQuiz, fallbackCoachMessage, fetchAnthropicCoachReply, fetchAnthropicQuiz, fetchQuizMotivation, makeCoachSystemPrompt } from "./lib/ai";
import { safeParseJSON, storageGet, storageSet } from "./hooks/useStorage";
import { useStreak } from "./hooks/useStreak";

const STARTER_COACH_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "I am ready. Bring me the week, the candle story, or the rule you keep breaking, and we will work it through.",
};

const DEFAULT_JOURNAL_DRAFT = {
  patternFound: "",
  chartNote: "",
  imageUrl: "",
  outcome: "pending",
  date: "",
};

function createDefaultTradeDrafts() {
  return WEEKS.reduce((acc, week) => {
    acc[week.id] = {
      pair: "EUR/USD",
      direction: "BUY",
      entry: "",
      sl: "",
      tp: "",
      pattern: week.title,
      notes: "",
      outcome: "OPEN",
    };
    return acc;
  }, {});
}

function createEmptyQuizState() {
  return {
    open: false,
    loading: false,
    error: "",
    completed: false,
    week: null,
    questions: [],
    index: 0,
    total: 0,
    score: 0,
    selectedLetter: "",
    correctLetter: "",
    locked: false,
    lastCorrect: false,
    motivation: "",
  };
}

function createQuizStateFromQuestions(week, questions, error = "") {
  return {
    ...createEmptyQuizState(),
    open: true,
    loading: false,
    error,
    week,
    questions,
    total: questions.length,
  };
}

function normalizeTradeDraft(draft, week) {
  const metrics = calculateTradeMetrics(draft);
  return {
    id: `trade-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    weekId: week.id,
    pair: draft.pair,
    direction: draft.direction,
    entry: draft.entry === "" ? "" : toNumber(draft.entry),
    sl: draft.sl === "" ? "" : toNumber(draft.sl),
    tp: draft.tp === "" ? "" : toNumber(draft.tp),
    outcome: draft.outcome,
    pips: metrics.pips,
    rr: metrics.rr,
    notes: draft.notes.trim(),
    pattern: draft.pattern.trim(),
    date: dateKey(),
    createdAt: Date.now(),
  };
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [loadMessage, setLoadMessage] = useState("");
  const [splashVisible, setSplashVisible] = useState(true);
  const [completed, setCompleted] = useState({});
  const [journalEntries, setJournalEntries] = useState([]);
  const [trades, setTrades] = useState([]);
  const [quizScores, setQuizScores] = useState({});
  const [activePhaseId, setActivePhaseId] = useState(PHASES[0].id);
  const [openWeeks, setOpenWeeks] = useState({ w1: true });
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingScrollKey, setPendingScrollKey] = useState("");
  const [tradeDrafts, setTradeDrafts] = useState(createDefaultTradeDrafts);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalWeek, setJournalWeek] = useState(null);
  const [journalDraft, setJournalDraft] = useState(DEFAULT_JOURNAL_DRAFT);
  const [quizState, setQuizState] = useState(createEmptyQuizState);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState([]);
  const [coachInput, setCoachInput] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");
  const [coachResetNotice, setCoachResetNotice] = useState("");

  const conceptRefs = useRef({});
  const coachThreadRef = useRef(null);
  const { streak, markActive } = useStreak();

  const activePhase = PHASES.find((phase) => phase.id === activePhaseId) || PHASES[0];
  const visibleWeeks = activePhase.weeks;
  const progressSummary = totalProgress(completed);
  const currentWeek = getCurrentWeekLabel(completed);
  const recentConcepts = getRecentCompletedConcepts(completed);
  const splashOverlay = splashVisible ? <SplashScreen /> : null;
  const searchResults = searchQuery.trim()
    ? WEEKS.flatMap((week) =>
        week.concepts
          .map((concept, conceptIndex) => ({
            weekId: week.id,
            conceptIndex,
            concept,
            week: week.week,
            weekTitle: week.title,
            phaseId: week.phaseId,
            phaseName: week.phaseName,
            phaseColor: week.phaseColor,
          }))
          .filter((item) => item.concept.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      )
    : [];

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [progressRaw, journalRaw, tradesRaw, quizRaw] = await Promise.all([
          storageGet(STORAGE_KEYS.progress),
          storageGet(STORAGE_KEYS.journal),
          storageGet(STORAGE_KEYS.trades),
          storageGet(STORAGE_KEYS.quizScores),
        ]);

        const progressMap = safeParseJSON(progressRaw, {});
        const journal = safeParseJSON(journalRaw, []);
        const tradeLogs = safeParseJSON(tradesRaw, []);
        const scores = safeParseJSON(quizRaw, {});

        if (!cancelled) {
          setCompleted(progressMap && typeof progressMap === "object" ? progressMap : {});
          setJournalEntries(Array.isArray(journal) ? journal : []);
          setTrades(Array.isArray(tradeLogs) ? tradeLogs.slice(-500) : []);
          setQuizScores(scores && typeof scores === "object" ? scores : {});
          setTradeDrafts(createDefaultTradeDrafts());
          setJournalDraft({
            ...DEFAULT_JOURNAL_DRAFT,
            date: dateKey(),
          });
          setOpenWeeks({ w1: true });
          setLoadMessage("");
        }
      } catch {
        if (!cancelled) {
          setLoadMessage("Storage is unavailable, so the tracker is running in memory.");
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashVisible(false);
    }, 1600);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const phaseHasOpen = visibleWeeks.some((week) => openWeeks[week.id]);
    if (!phaseHasOpen && visibleWeeks[0]) {
      setOpenWeeks((previous) => ({ ...previous, [visibleWeeks[0].id]: true }));
    }
  }, [activePhaseId]);

  useEffect(() => {
    if (!pendingScrollKey) return undefined;
    const timer = setTimeout(() => {
      const node = conceptRefs.current[pendingScrollKey];
      if (node && typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
        node.classList.add("concept-row--flash");
        setTimeout(() => node.classList.remove("concept-row--flash"), 1200);
      }
      setPendingScrollKey("");
    }, 80);
    return () => clearTimeout(timer);
  }, [pendingScrollKey, openWeeks, activePhaseId, searchQuery]);

  useEffect(() => {
    if (!coachOpen) return undefined;
    const timer = setTimeout(() => {
      if (coachThreadRef.current) {
        coachThreadRef.current.scrollTop = coachThreadRef.current.scrollHeight;
      }
    }, 20);
    return () => clearTimeout(timer);
  }, [coachMessages, coachLoading, coachOpen]);

  useEffect(() => {
    if (!coachOpen) return;
    if (coachMessages.length === 0) {
      setCoachMessages([STARTER_COACH_MESSAGE]);
    }
  }, [coachOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (coachResetNotice) {
        setCoachResetNotice("");
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [coachResetNotice]);

  async function persistProgressMap(nextMap) {
    setCompleted(nextMap);
    await storageSet(STORAGE_KEYS.progress, JSON.stringify(nextMap));
  }

  async function persistTrades(nextTrades) {
    const pruned = nextTrades.slice(-500);
    setTrades(pruned);
    await storageSet(STORAGE_KEYS.trades, JSON.stringify(pruned));
  }

  async function persistJournal(nextJournal) {
    const pruned = nextJournal.slice(-250);
    setJournalEntries(pruned);
    await storageSet(STORAGE_KEYS.journal, JSON.stringify(pruned));
  }

  async function persistQuizScores(nextScores) {
    setQuizScores(nextScores);
    await storageSet(STORAGE_KEYS.quizScores, JSON.stringify(nextScores));
  }

  function registerConceptRef(key, node) {
    if (!node) return;
    conceptRefs.current[key] = node;
  }

  async function toggleConcept(weekId, conceptIndex) {
    const key = conceptKey(weekId, conceptIndex);
    const nextMap = { ...completed };
    if (nextMap[key]) {
      delete nextMap[key];
    } else {
      nextMap[key] = true;
    }
    await persistProgressMap(nextMap);
    await markActive();
  }

  async function toggleWeek(week) {
    const allDone = week.concepts.every((_, conceptIndex) => completed[conceptKey(week.id, conceptIndex)]);
    const nextMap = { ...completed };
    week.concepts.forEach((_, conceptIndex) => {
      const key = conceptKey(week.id, conceptIndex);
      if (allDone) {
        delete nextMap[key];
      } else {
        nextMap[key] = true;
      }
    });
    await persistProgressMap(nextMap);
    await markActive();
  }

  function toggleWeekOpen(weekId) {
    setOpenWeeks((previous) => ({ ...previous, [weekId]: !previous[weekId] }));
  }

  function openWeek(weekId) {
    setOpenWeeks((previous) => ({ ...previous, [weekId]: true }));
  }

  function handleSearchSelect(result) {
    setActivePhaseId(result.phaseId);
    openWeek(result.weekId);
    setPendingScrollKey(conceptKey(result.weekId, result.conceptIndex));
  }

  function openJournalForWeek(week) {
    setJournalWeek(week);
    setJournalDraft({
      patternFound: week.title,
      chartNote: "",
      imageUrl: "",
      outcome: "pending",
      date: dateKey(),
    });
    setJournalOpen(true);
  }

  function updateJournalDraft(field, value) {
    setJournalDraft((previous) => ({ ...previous, [field]: value }));
  }

  async function submitJournal(event) {
    event.preventDefault();
    if (!journalWeek) return;

    const entry = {
      id: `journal-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      weekId: journalWeek.id,
      date: journalDraft.date || dateKey(),
      patternFound: journalDraft.patternFound.trim(),
      chartNote: journalDraft.chartNote.trim(),
      imageUrl: journalDraft.imageUrl.trim() || undefined,
      outcome: journalDraft.outcome,
      createdAt: Date.now(),
    };

    await persistJournal([...journalEntries, entry]);
    await markActive();
    setJournalDraft({
      ...DEFAULT_JOURNAL_DRAFT,
      patternFound: journalWeek.title,
      date: dateKey(),
    });
  }

  function updateTradeDraft(weekId, field, value) {
    setTradeDrafts((previous) => ({
      ...previous,
      [weekId]: {
        ...previous[weekId],
        [field]: value,
      },
    }));
  }

  async function submitTrade(event, week) {
    event.preventDefault();
    const draft = tradeDrafts[week.id];
    const trade = normalizeTradeDraft(draft, week);
    await persistTrades([...trades, trade]);
    await markActive();
    setTradeDrafts((previous) => ({
      ...previous,
      [week.id]: {
        ...previous[week.id],
        notes: "",
        entry: "",
        sl: "",
        tp: "",
        outcome: "OPEN",
      },
    }));
  }

  async function updateTradeOutcome(tradeId, outcome) {
    const next = trades.map((trade) => {
      if (trade.id !== tradeId) return trade;
      const updated = {
        ...trade,
        outcome,
      };
      const metrics = calculateTradeMetrics(updated);
      return {
        ...updated,
        pips: metrics.pips,
        rr: metrics.rr,
      };
    });
    await persistTrades(next);
  }

  function resetQuizState() {
    setQuizState(createEmptyQuizState());
  }

  async function startQuiz(week) {
    setQuizState({
      ...createEmptyQuizState(),
      open: true,
      loading: true,
      week,
    });

    try {
      const apiQuestions = await fetchAnthropicQuiz(week);
      const fallback = createFallbackQuiz(week);
      const sourceQuestions = Array.isArray(apiQuestions) && apiQuestions.length ? apiQuestions : fallback;
      const sanitized = sourceQuestions.slice(0, 5).map((question, index) => {
        const safeOptions = Array.isArray(question.options) && question.options.length === 4 ? question.options : fallback[index].options;
        const answer = String(question.answer || "A").toUpperCase().slice(0, 1) || "A";
        return {
          question: String(question.question || `Question ${index + 1}`),
          options: safeOptions.map((option, optionIndex) => {
            if (typeof option === "string" && /^[A-D]\./.test(option)) return option;
            return `${String.fromCharCode(65 + optionIndex)}. ${String(option || "")}`;
          }),
          answer,
        };
      });

      while (sanitized.length < 5) {
        sanitized.push(fallback[sanitized.length]);
      }

      setQuizState(createQuizStateFromQuestions(week, sanitized, ""));
    } catch {
      const fallback = createFallbackQuiz(week);
      setQuizState(createQuizStateFromQuestions(week, fallback, "Quiz service is unavailable right now."));
    }
  }

  async function finishQuiz(score, total, week) {
    const nextScores = { ...quizScores, [week.id]: Math.round((score / total) * 100) };
    await persistQuizScores(nextScores);

    let motivation = "";
    try {
      motivation = await fetchQuizMotivation({ week, score, total });
    } catch {
      motivation = fallbackCoachMessage(score, total);
    }

    setQuizState((previous) => ({
      ...previous,
      loading: false,
      completed: true,
      score,
      total,
      motivation: motivation || fallbackCoachMessage(score, total),
    }));
  }

  function selectQuizAnswer(letter) {
    const question = quizState.questions[quizState.index];
    if (!question || quizState.locked) return;
    const correctLetter = String(question.answer || "A").toUpperCase();
    const isCorrect = correctLetter === letter;
    setQuizState((previous) => ({
      ...previous,
      selectedLetter: letter,
      correctLetter,
      locked: true,
      lastCorrect: isCorrect,
      score: previous.score + (isCorrect ? 1 : 0),
    }));
  }

  async function nextQuizStep() {
    if (!quizState.locked) return;
    if (quizState.index + 1 < quizState.questions.length) {
      setQuizState((previous) => ({
        ...previous,
        index: previous.index + 1,
        selectedLetter: "",
        correctLetter: "",
        locked: false,
        lastCorrect: false,
      }));
      return;
    }

    const finalScore = quizState.score;
    const week = quizState.week;
    if (week) {
      await finishQuiz(finalScore, quizState.total || quizState.questions.length || 5, week);
    }
  }

  async function sendCoachMessage(event) {
    event.preventDefault();
    const message = coachInput.trim();
    if (!message) return;

    const resetNeeded = coachMessages.length >= 10;
    const baseMessages = resetNeeded ? [STARTER_COACH_MESSAGE] : coachMessages;
    const nextMessages = [
      ...baseMessages,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
      },
    ];

    if (resetNeeded) {
      setCoachResetNotice("Context reset after 10 messages to keep the coach sharp.");
    }

    setCoachMessages(nextMessages);
    setCoachInput("");
    setCoachLoading(true);
    setCoachError("");

    try {
      const systemPrompt = makeCoachSystemPrompt(activePhaseId, completed);
      const history = nextMessages.slice(-10).map((entry) => ({
        role: entry.role === "user" ? "user" : "assistant",
        content: entry.content,
      }));
      const reply = await fetchAnthropicCoachReply({
        systemPrompt,
        history,
        userMessage: message,
      });

      setCoachMessages((previous) => [
        ...previous,
        {
          id: `coach-${Date.now()}`,
          role: "assistant",
          content: reply || "Keep the chart clean and the reasoning tighter.",
        },
      ]);
    } catch {
      setCoachError("Coach is unavailable right now.");
      setCoachMessages((previous) => [
        ...previous,
        {
          id: `coach-fallback-${Date.now()}`,
          role: "assistant",
          content:
            "Coach is unavailable right now, but the rule still stands: stay with the chart, wait for confirmation, and write the reason down.",
        },
      ]);
    } finally {
      setCoachLoading(false);
    }
  }

  const coachContextSummary = `Week ${currentWeek.week} in ${activePhase.name}. Recent concepts: ${recentConcepts.length ? recentConcepts.join(" | ") : "none yet"}.`;

  if (!loaded) {
    return (
      <div className="fxj-shell fxj-shell--loading">
        <TickerBar items={TICKER_ITEMS} />
        {splashOverlay}
        <main className="shell-shell">
          <section className="loading-hero">
            <div className="loading-line loading-line--long" />
            <div className="loading-line loading-line--short" />
            <div className="loading-grid">
              <div className="loading-card" />
              <div className="loading-card" />
              <div className="loading-card" />
            </div>
            <div className="loading-stack">
              <div className="loading-line" />
              <div className="loading-line" />
              <div className="loading-line loading-line--short" />
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="fxj-shell">
      <div className="fxj-bg" />
      <div className="fxj-noise" />
      <TickerBar items={TICKER_ITEMS} />
      {splashOverlay}

      <main className="shell-shell">
        <Header
          activePhase={activePhase}
          progressSummary={progressSummary}
          streak={streak}
          currentWeek={currentWeek}
          loadMessage={loadMessage}
        />

        <DailyLoopSection />
        <IronRulesSection />

        <section className="panel panel--stack tracker-panel">
          <div className="section-head">
            <div>
              <div className="section-kicker">TRACKER</div>
              <h2>12-week curriculum</h2>
            </div>
            <p className="section-note">Use the search bar to jump straight into a concept row across either phase.</p>
          </div>

          <SearchBar value={searchQuery} onChange={setSearchQuery} resultCount={searchResults.length} />
          <SearchResults query={searchQuery} results={searchResults} onSelect={handleSearchSelect} />
          <PhaseSelector phases={PHASES} activePhaseId={activePhaseId} onSelect={setActivePhaseId} />

          <div className="week-list">
            {visibleWeeks.map((week) => (
              <WeekCard
                key={week.id}
                week={week}
                progress={weekProgress(week.id, week.concepts, completed)}
                isOpen={Boolean(openWeeks[week.id])}
                onToggleOpen={() => toggleWeekOpen(week.id)}
                completedMap={completed}
                onToggleConcept={toggleConcept}
                onToggleWeek={toggleWeek}
                query={searchQuery}
                score={quizScores[week.id]}
                onStartQuiz={startQuiz}
                tradeDraft={tradeDrafts[week.id]}
                onTradeDraftChange={updateTradeDraft}
                onTradeSubmit={submitTrade}
                trades={trades
                  .filter((trade) => trade.weekId === week.id)
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))}
                onTradeOutcomeChange={updateTradeOutcome}
                onOpenJournal={openJournalForWeek}
                registerConceptRef={registerConceptRef}
              />
            ))}
          </div>
        </section>
      </main>

      <FooterBar />

      <CoachLauncher onClick={() => setCoachOpen(true)} />

      <JournalDrawer
        open={journalOpen}
        week={journalWeek}
        draft={journalDraft}
        onClose={() => setJournalOpen(false)}
        onDraftChange={updateJournalDraft}
        onSubmit={submitJournal}
        recentEntries={journalEntries
          .filter((entry) => journalWeek && entry.weekId === journalWeek.id)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
          .slice(0, 5)}
      />

      <QuizModal
        state={quizState}
        onClose={resetQuizState}
        onSelectOption={selectQuizAnswer}
        onNext={nextQuizStep}
        onRetry={() => {
          if (quizState.week) {
            startQuiz(quizState.week);
          }
        }}
      />

      <CoachDrawer
        open={coachOpen}
        messages={coachMessages}
        input={coachInput}
        onInputChange={setCoachInput}
        onSend={sendCoachMessage}
        onClose={() => setCoachOpen(false)}
        loading={coachLoading}
        notice={coachError}
        resetNotice={coachResetNotice}
        contextSummary={coachContextSummary}
        threadRef={coachThreadRef}
      />
    </div>
  );
}
