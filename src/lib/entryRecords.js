import { dateKey } from "./date";
import { getWeekById } from "./progress";
import { WEEKS } from "../data/curriculum";
import { calculateTradeMetrics, toNumber } from "./trades";

function resolveWeek(weekId) {
  return getWeekById(weekId) || WEEKS[0] || null;
}

export function sortEntriesDesc(entries) {
  return [...entries].sort((a, b) => (Number(b?.createdAt) || 0) - (Number(a?.createdAt) || 0));
}

export function normalizeStoredTradeEntry(entry) {
  const week = resolveWeek(entry.weekId);
  const normalized = {
    ...entry,
    id: String(entry.id || `trade-${Date.now()}`),
    weekId: week.id,
    weekLabel: `Week ${week.week}`,
    pair: entry.pair || "EUR/USD",
    direction: entry.direction || "BUY",
    entry: entry.entry === "" || entry.entry == null ? "" : entry.entry,
    sl: entry.sl === "" || entry.sl == null ? "" : entry.sl,
    tp: entry.tp === "" || entry.tp == null ? "" : entry.tp,
    outcome: entry.outcome || "OPEN",
    pattern: entry.pattern || entry.setup || week.title,
    setup: entry.setup || entry.pattern || week.title,
    notes: entry.notes || "",
    screenshotUrl: entry.screenshotUrl || "",
    createdAt: Number(entry.createdAt) || Date.now(),
  };

  const metrics = calculateTradeMetrics(normalized);
  return {
    ...normalized,
    pips: Number.isFinite(Number(entry.pips)) ? Number(entry.pips) : metrics.pips,
    rr: Number.isFinite(Number(entry.rr)) ? Number(entry.rr) : metrics.rr,
  };
}

export function createTradeEntryFromDraft(draft, week) {
  const resolvedWeek = week || resolveWeek(draft.weekId);
  const base = {
    pair: draft.pair,
    direction: draft.direction || "BUY",
    entry: draft.entry,
    sl: draft.sl,
    tp: draft.tp,
    outcome: draft.outcome,
    pattern: (draft.pattern || draft.setup || resolvedWeek.title).trim(),
    setup: (draft.pattern || draft.setup || resolvedWeek.title).trim(),
    notes: draft.notes || "",
    screenshotUrl: draft.screenshotUrl || "",
    weekId: resolvedWeek.id,
  };

  const metrics = calculateTradeMetrics(base);
  return {
    id: `trade-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    weekId: resolvedWeek.id,
    weekLabel: `Week ${resolvedWeek.week}`,
    pair: base.pair,
    direction: base.direction,
    entry: base.entry === "" ? "" : toNumber(base.entry),
    sl: base.sl === "" ? "" : toNumber(base.sl),
    tp: base.tp === "" ? "" : toNumber(base.tp),
    outcome: base.outcome,
    pattern: base.pattern,
    setup: base.setup,
    notes: base.notes.trim(),
    screenshotUrl: base.screenshotUrl.trim ? base.screenshotUrl.trim() : base.screenshotUrl,
    pips: metrics.pips,
    rr: metrics.rr,
    date: dateKey(),
    createdAt: Date.now(),
  };
}

export function createJournalEntryFromDraft(draft) {
  const week = resolveWeek(draft.weekId);
  return createTradeEntryFromDraft(
    {
      pair: draft.pair,
      direction: "BUY",
      entry: draft.entry,
      sl: draft.sl,
      tp: draft.tp,
      outcome: draft.outcome,
      pattern: draft.setup,
      setup: draft.setup,
      notes: draft.notes,
      screenshotUrl: draft.screenshotUrl,
      weekId: week.id,
    },
    week
  );
}
