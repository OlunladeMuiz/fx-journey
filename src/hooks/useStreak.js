import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "../data/curriculum";
import { dateKey, dayDiff } from "../lib/date";
import { safeParseJSON, storageGet, storageSet } from "./useStorage";

export function useStreak() {
  const [state, setState] = useState({
    streak: 1,
    lastActive: dateKey(),
    loaded: false,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const raw = await storageGet(STORAGE_KEYS.streaks);
        const parsed = safeParseJSON(raw, { lastActive: dateKey(), streak: 1 });
        const today = dateKey();
        const lastActive = typeof parsed.lastActive === "string" ? parsed.lastActive : today;
        const streak = Number.isFinite(Number(parsed.streak)) ? Number(parsed.streak) : 1;

        let next = { lastActive: today, streak: 1 };
        if (lastActive === today) {
          next = { lastActive: today, streak: Math.max(1, streak) };
        } else {
          const diff = dayDiff(lastActive, today);
          next = diff === 1 ? { lastActive: today, streak: Math.max(1, streak) + 1 } : { lastActive: today, streak: 1 };
        }

        if (!cancelled) {
          setState({
            ...next,
            loaded: true,
          });
        }

        await storageSet(STORAGE_KEYS.streaks, JSON.stringify(next));
      } catch {
        if (!cancelled) {
          setState({
            streak: 1,
            lastActive: dateKey(),
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
      if (previous.lastActive === today) return previous;

      const diff = dayDiff(previous.lastActive, today);
      const next = {
        lastActive: today,
        streak: diff === 1 ? previous.streak + 1 : 1,
        loaded: true,
      };

      void storageSet(STORAGE_KEYS.streaks, JSON.stringify({ lastActive: next.lastActive, streak: next.streak }));
      return next;
    });
  }, []);

  return {
    streak: state.streak,
    lastActive: state.lastActive,
    loaded: state.loaded,
    markActive,
  };
}
