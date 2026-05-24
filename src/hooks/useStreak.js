import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "../data/curriculum";
import { dateKey, dayDiff } from "../lib/date";
import { safeParseJSON, storageGet, storageSet } from "./useStorage";

function normalizeStreakData(raw) {
  const today = dateKey();
  const parsed = safeParseJSON(raw, {});
  const lastDate = typeof parsed.lastDate === "string" ? parsed.lastDate : typeof parsed.lastActive === "string" ? parsed.lastActive : today;
  const current = Number.isFinite(Number(parsed.current ?? parsed.streak)) ? Number(parsed.current ?? parsed.streak) : 1;
  const longest = Number.isFinite(Number(parsed.longest)) ? Number(parsed.longest) : current;

  return {
    current: Math.max(1, current),
    longest: Math.max(1, longest),
    lastDate,
  };
}

export function useStreak() {
  const [state, setState] = useState({
    current: 1,
    longest: 1,
    lastDate: dateKey(),
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const raw = (await storageGet(STORAGE_KEYS.streak)) || (await storageGet(STORAGE_KEYS.legacyStreak));
        const parsed = normalizeStreakData(raw);
        const today = dateKey();
        const diff = dayDiff(parsed.lastDate, today);

        let nextCurrent = parsed.current;
        if (parsed.lastDate === today) {
          nextCurrent = parsed.current;
        } else if (diff === 1) {
          nextCurrent = parsed.current + 1;
        } else {
          nextCurrent = 1;
        }

        const next = {
          current: Math.max(1, nextCurrent),
          longest: Math.max(parsed.longest, Math.max(1, nextCurrent)),
          lastDate: today,
        };

        if (!cancelled) {
          setState({
            ...next,
            loaded: true,
          });
        }

        await storageSet(STORAGE_KEYS.streak, JSON.stringify(next));
      } catch {
        if (!cancelled) {
          setState({
            current: 1,
            longest: 1,
            lastDate: dateKey(),
            loaded: true,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const markActive = useCallback(async () => {
    const today = dateKey();
    setState((previous) => {
      if (previous.lastDate === today) return previous;

      const diff = dayDiff(previous.lastDate, today);
      const current = diff === 1 ? previous.current + 1 : 1;
      const next = {
        current,
        longest: Math.max(previous.longest, current),
        lastDate: today,
        loaded: true,
      };

      void storageSet(STORAGE_KEYS.streak, JSON.stringify({ current: next.current, longest: next.longest, lastDate: next.lastDate }));
      return next;
    });
  }, []);

  return {
    streak: state.current,
    longestStreak: state.longest,
    lastActive: state.lastDate,
    loaded: state.loaded,
    markActive,
  };
}
