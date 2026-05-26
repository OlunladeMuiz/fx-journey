import React, { useEffect, useRef, useState } from "react";
import { CoachDrawer, CoachLauncher, QuizModal } from "./components/Overlays";
import { BottomNav, DashboardView, JournalView, PatternLibraryView, PhaseOverviewView, PhaseView, WeekDetailView } from "./components/Routes";
import { FooterBar, SplashScreen, ThemeToggle, TickerBar } from "./components/Chrome";
import { PHASES, PATTERN_LIBRARY, STORAGE_KEYS, TICKER_ITEMS, WEEKS } from "./data/curriculum";
import { conceptKey, getContinueWeek, getCurrentWeekLabel, getRecentCompletedConcepts, getWeekById, totalProgress, weekProgress } from "./lib/progress";
import { calculateTradeMetrics } from "./lib/trades";
import { createJournalEntryFromDraft, createTradeEntryFromDraft, normalizeStoredTradeEntry, sortEntriesDesc } from "./lib/entryRecords";
import { createFallbackQuiz, fallbackCoachMessage, fetchAnthropicCoachReply, fetchAnthropicQuiz, fetchQuizMotivation, makeCoachSystemPrompt } from "./lib/ai";
import { resolveRoute, withQuery } from "./lib/router";
import { loadBooleanMap, loadJsonCollection, loadNumberMap } from "./lib/persistenceMaps";
import { storageDelete, storageGet, storageKeys, storageSet } from "./hooks/useStorage";
import { useStreak } from "./hooks/useStreak";

const STARTER_COACH_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content: "I am ready. Bring me the week, the candle story, or the rule you keep breaking, and we will work it through.",
};

const DEFAULT_WEEK_ID = WEEKS[0]?.id || "";

function getInitialTheme() {
  if (typeof document !== "undefined") {
    const theme = document.documentElement.dataset.theme;
    if (theme === "light" || theme === "dark") return theme;
  }

  if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }

  return "dark";
}

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

function createJournalDraft(weekId = DEFAULT_WEEK_ID) {
  return {
    weekId,
    pair: "EUR/USD",
    setup: "",
    entry: "",
    sl: "",
    tp: "",
    outcome: "OPEN",
    screenshotUrl: "",
    notes: "",
  };
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

export default function App() {
  const initialRoute = typeof window !== "undefined" ? resolveRoute(window.location.pathname, window.location.search) : resolveRoute("/", "");

  const [loaded, setLoaded] = useState(false);
  const [loadMessage, setLoadMessage] = useState("");
  const [splashVisible, setSplashVisible] = useState(true);
  const [completed, setCompleted] = useState({});
  const [trades, setTrades] = useState([]);
  const [quizScores, setQuizScores] = useState({});
  const [patternConfidence, setPatternConfidence] = useState({});
  const [activePhaseId, setActivePhaseId] = useState(PHASES[0].id);
  const [openWeeks, setOpenWeeks] = useState({ [DEFAULT_WEEK_ID]: true });
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingScrollKey, setPendingScrollKey] = useState("");
  const [tradeDrafts, setTradeDrafts] = useState(createDefaultTradeDrafts);
  const [journalDraft, setJournalDraft] = useState(() => createJournalDraft(DEFAULT_WEEK_ID));
  const [quizState, setQuizState] = useState(createEmptyQuizState);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachMessages, setCoachMessages] = useState([]);
  const [coachInput, setCoachInput] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState("");
  const [coachResetNotice, setCoachResetNotice] = useState("");
  const [routeState, setRouteState] = useState(initialRoute);
  const [theme, setTheme] = useState(getInitialTheme);
  const [themeHydrated, setThemeHydrated] = useState(false);

  const conceptRefs = useRef({});
  const coachThreadRef = useRef(null);
  const { streak, markActive } = useStreak();

  const continueWeek = getContinueWeek(completed);
  const dashboardPhase = PHASES.find((phase) => phase.id === continueWeek.phaseId) || PHASES[0];
  const selectedPhase = PHASES.find((phase) => phase.id === activePhaseId) || dashboardPhase;
  const routeWeek = routeState.route === "week" ? getWeekById(routeState.params.weekId) : null;
  const routePhase = routeState.route === "phase" ? PHASES.find((phase) => phase.id === routeState.params.phaseId) || selectedPhase : routeWeek ? PHASES.find((phase) => phase.id === routeWeek.phaseId) || selectedPhase : selectedPhase;
  const activePhase = routeState.route === "dashboard" ? dashboardPhase : routePhase;
  const visibleWeeks = selectedPhase.weeks;
  const progressSummary = totalProgress(completed);
  const currentWeek = getCurrentWeekLabel(completed);
  const recentConcepts = getRecentCompletedConcepts(completed);
  const splashOverlay = splashVisible ? <SplashScreen /> : null;
  const toggleTheme = () => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  };
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
    const onPopState = () => {
      setRouteState(resolveRoute(window.location.pathname, window.location.search));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const savedTheme = await storageGet(STORAGE_KEYS.theme);
      if (!cancelled && (savedTheme === "light" || savedTheme === "dark")) {
        setTheme(savedTheme);
      }
      if (!cancelled) {
        setThemeHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;

    const themeColor = theme === "light" ? "#ffffff" : "#080c10";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", themeColor);
  }, [theme]);

  useEffect(() => {
    if (!themeHydrated) return;
    void storageSet(STORAGE_KEYS.theme, theme);
  }, [theme, themeHydrated]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [progressMap, loadedTrades, loadedScores, loadedConfidence] = await Promise.all([
          loadBooleanMap(STORAGE_KEYS.progressPrefix, STORAGE_KEYS.legacyProgress),
          loadJsonCollection(STORAGE_KEYS.journalPrefix, normalizeStoredTradeEntry, [STORAGE_KEYS.legacyTrades, STORAGE_KEYS.legacyJournal]),
          loadNumberMap(STORAGE_KEYS.quizScorePrefix, STORAGE_KEYS.legacyQuizScores),
          loadNumberMap(STORAGE_KEYS.patternConfidencePrefix),
        ]);

        if (!cancelled) {
          setCompleted(progressMap);
          setTrades(loadedTrades.slice(0, 500));
          setQuizScores(loadedScores);
          setPatternConfidence(loadedConfidence);
          setTradeDrafts(createDefaultTradeDrafts());

          const currentContinueWeek = getContinueWeek(progressMap);
          setJournalDraft(createJournalDraft(currentContinueWeek.id));
          setActivePhaseId(currentContinueWeek.phaseId);
          setOpenWeeks({ [currentContinueWeek.id]: true });
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
    if (routeState.route === "phase" && routeState.params.phaseId) {
      setActivePhaseId(routeState.params.phaseId);
    } else if (routeState.route === "week" && routeWeek) {
      setActivePhaseId(routeWeek.phaseId);
    }
  }, [routeState.route, routeState.params.phaseId, routeState.params.weekId]);

  useEffect(() => {
    const phaseHasOpen = visibleWeeks.some((week) => openWeeks[week.id]);
    if (!phaseHasOpen && visibleWeeks[0]) {
      setOpenWeeks((previous) => ({ ...previous, [visibleWeeks[0].id]: true }));
    }
  }, [selectedPhase.id]);

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
  }, [pendingScrollKey, routeState.route, routeState.params.weekId, searchQuery]);

  useEffect(() => {
    if (routeState.route !== "week" || !routeWeek) return undefined;

    function handleKeyDown(event) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      const target = event.target;
      if (
        target &&
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))
      ) {
        return;
      }

      const currentIndex = WEEKS.findIndex((week) => week.id === routeWeek.id);
      if (currentIndex === -1) return;

      const nextIndex = event.key === "ArrowLeft" ? currentIndex - 1 : currentIndex + 1;
      const nextWeek = WEEKS[nextIndex];
      if (!nextWeek) return;

      event.preventDefault();
      void navigate(`/weeks/${nextWeek.id}`);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [routeState.route, routeWeek?.id]);

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

  async function navigate(path, options = {}) {
    const { replace = false } = options;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === path) return;
    if (replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }
    setRouteState(resolveRoute(window.location.pathname, window.location.search));
  }

  async function persistProgressMap(nextMap) {
    setCompleted(nextMap);
    const writes = [];

    WEEKS.forEach((week) => {
      week.concepts.forEach((_, conceptIndex) => {
        const key = conceptKey(week.id, conceptIndex);
        const storageKey = `${STORAGE_KEYS.progressPrefix}${key}`;
        if (nextMap[key]) {
          writes.push(storageSet(storageKey, "1"));
        } else {
          writes.push(storageDelete(storageKey));
        }
      });
    });

    await Promise.all(writes);
  }

  async function persistTrades(nextTrades) {
    const pruned = sortEntriesDesc(nextTrades).slice(0, 500);
    setTrades(pruned);

    const existingKeys = await storageKeys(STORAGE_KEYS.journalPrefix);
    const activeKeys = new Set(pruned.map((entry) => `${STORAGE_KEYS.journalPrefix}${entry.id}`));
    const writes = existingKeys
      .filter((key) => !activeKeys.has(key))
      .map((key) => storageDelete(key))
      .concat(pruned.map((entry) => storageSet(`${STORAGE_KEYS.journalPrefix}${entry.id}`, JSON.stringify(entry))));

    await Promise.all(writes);
  }

  async function persistQuizScores(nextScores) {
    setQuizScores(nextScores);
    const writes = WEEKS.map((week) => {
      const value = nextScores[week.id];
      const key = `${STORAGE_KEYS.quizScorePrefix}${week.id}`;
      return value == null ? storageDelete(key) : storageSet(key, JSON.stringify(value));
    });
    await Promise.all(writes);
  }

  async function persistPatternConfidence(nextMap) {
    setPatternConfidence(nextMap);
    const writes = PATTERN_LIBRARY.map((item) => {
      const value = nextMap[item.id];
      const key = `${STORAGE_KEYS.patternConfidencePrefix}${item.id}`;
      return value == null ? storageDelete(key) : storageSet(key, JSON.stringify(value));
    });
    await Promise.all(writes);
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
    setPendingScrollKey(conceptKey(result.weekId, result.conceptIndex));
    void navigate(`/weeks/${result.weekId}`);
  }

  function openJournalForWeek(week) {
    setJournalDraft({
      weekId: week.id,
      pair: "EUR/USD",
      setup: week.title,
      entry: "",
      sl: "",
      tp: "",
      outcome: "OPEN",
      screenshotUrl: "",
      notes: "",
    });
    void navigate(withQuery("/journal", { week: week.id }));
  }

  function updateJournalDraft(field, value) {
    setJournalDraft((previous) => ({ ...previous, [field]: value }));
  }

  async function submitJournal(event) {
    event.preventDefault();
    const week = getWeekById(journalDraft.weekId) || WEEKS[0];
    if (!week) return;

    const entry = createJournalEntryFromDraft(journalDraft);
    await persistTrades([...trades, entry]);
    await markActive();
    setJournalDraft(createJournalDraft(week.id));
    void navigate(withQuery("/journal", { week: week.id }));
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
    const trade = createTradeEntryFromDraft(draft, week);
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
          content: "Coach is unavailable right now, but the rule still stands: stay with the chart, wait for confirmation, and write the reason down.",
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

  let content = null;

  if (routeState.route === "dashboard") {
    content = (
      <DashboardView
        activePhase={dashboardPhase}
        progressSummary={progressSummary}
        streak={streak}
        currentWeek={continueWeek}
        continueWeek={continueWeek}
        onContinue={() => navigate(`/weeks/${continueWeek.id}`)}
        loadMessage={loadMessage}
      />
    );
  } else if (routeState.route === "phases") {
    content = (
      <PhaseOverviewView
        phases={PHASES}
        completedMap={completed}
        onEnterPhase={(phaseId) => navigate(`/phases/${phaseId}`)}
        onNavigate={navigate}
      />
    );
  } else if (routeState.route === "phase") {
    content = (
      <PhaseView
        phase={selectedPhase}
        phases={PHASES}
        visibleWeeks={visibleWeeks}
        completedMap={completed}
        openWeeks={openWeeks}
        query={searchQuery}
        searchResults={searchResults}
        activePhaseId={activePhaseId}
        onNavigate={navigate}
        onPhaseSelect={(phaseId) => {
          setActivePhaseId(phaseId);
          navigate(`/phases/${phaseId}`);
        }}
        onSearchChange={setSearchQuery}
        onToggleWeekOpen={toggleWeekOpen}
        onToggleConcept={toggleConcept}
        onToggleWeek={toggleWeek}
        onSearchSelect={handleSearchSelect}
        onOpenJournal={openJournalForWeek}
        onStartQuiz={startQuiz}
        tradeDrafts={tradeDrafts}
        trades={trades}
        quizScores={quizScores}
        registerConceptRef={registerConceptRef}
        onTradeDraftChange={updateTradeDraft}
        onTradeSubmit={submitTrade}
        onTradeOutcomeChange={updateTradeOutcome}
      />
    );
  } else if (routeState.route === "week") {
    const week = routeWeek || continueWeek;
    const weekTrades = trades.filter((trade) => trade.weekId === week.id);
    content = (
      <WeekDetailView
        week={week}
        phase={PHASES.find((phase) => phase.id === week.phaseId) || selectedPhase}
        completedMap={completed}
        progress={weekProgress(week.id, week.concepts, completed)}
        score={quizScores[week.id]}
        query={searchQuery}
        tradeDraft={tradeDrafts[week.id]}
        trades={weekTrades}
        quizScores={quizScores}
        onToggleConcept={toggleConcept}
        onToggleWeek={toggleWeek}
        onStartQuiz={startQuiz}
        onOpenJournal={openJournalForWeek}
        onTradeDraftChange={updateTradeDraft}
        onTradeSubmit={submitTrade}
        onTradeOutcomeChange={updateTradeOutcome}
        registerConceptRef={registerConceptRef}
        onNavigate={navigate}
      />
    );
  } else if (routeState.route === "journal") {
    content = (
      <JournalView
        entries={trades}
        draft={journalDraft}
        weekOptions={WEEKS}
        onDraftChange={updateJournalDraft}
        onSubmit={submitJournal}
        onNavigate={navigate}
        selectedWeekId={routeState.query.get("week") || ""}
        queryParams={routeState.query}
      />
    );
  } else if (routeState.route === "patterns") {
    content = (
      <PatternLibraryView
        patterns={PATTERN_LIBRARY}
        confidenceMap={patternConfidence}
        onConfidenceChange={(id, value) => {
          void persistPatternConfidence({
            ...patternConfidence,
            [id]: value,
          });
        }}
        onNavigate={navigate}
      />
    );
  }

  return (
    <div className="fxj-shell">
      <div className="fxj-bg" />
      <div className="fxj-noise" />
      <TickerBar items={TICKER_ITEMS} />
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      {splashOverlay}

      {content}

      <FooterBar />
      <BottomNav route={routeState.route} onNavigate={navigate} />
      <CoachLauncher onClick={() => setCoachOpen(true)} />

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
