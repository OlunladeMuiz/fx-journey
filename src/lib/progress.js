import { TOTAL_CONCEPTS, WEEKS } from "../data/curriculum";

export function conceptKey(weekId, conceptIndex) {
  return `${weekId}-${conceptIndex}`;
}

export function weekProgress(weekId, concepts, completedMap) {
  const total = concepts.length || 1;
  const done = concepts.reduce((count, _concept, index) => {
    return completedMap[conceptKey(weekId, index)] ? count + 1 : count;
  }, 0);
  return Math.round((done / total) * 100);
}

export function totalProgress(completedMap) {
  const done = WEEKS.reduce((count, week) => {
    return count + week.concepts.reduce((inner, _concept, index) => {
      return completedMap[conceptKey(week.id, index)] ? inner + 1 : inner;
    }, 0);
  }, 0);

  return {
    done,
    total: TOTAL_CONCEPTS,
    percent: TOTAL_CONCEPTS ? Math.round((done / TOTAL_CONCEPTS) * 100) : 0,
  };
}

export function getCurrentWeekLabel(completedMap) {
  let lastActive = WEEKS[0];
  for (let index = 0; index < WEEKS.length; index += 1) {
    const week = WEEKS[index];
    const progress = weekProgress(week.id, week.concepts, completedMap);
    if (progress > 0) lastActive = week;
  }
  return lastActive;
}

export function getRecentCompletedConcepts(completedMap) {
  const finished = [];
  WEEKS.forEach((week) => {
    week.concepts.forEach((concept, index) => {
      if (completedMap[conceptKey(week.id, index)]) {
        finished.push(concept);
      }
    });
  });
  return finished.slice(-6);
}
