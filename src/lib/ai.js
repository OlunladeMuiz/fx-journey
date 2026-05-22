import { PHASES, WEEKS } from "../data/curriculum";
import { getCurrentWeekLabel, getRecentCompletedConcepts } from "./progress";

export function stripCodeFences(text) {
  return String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

export function parseAnthropicText(data) {
  const text = data && Array.isArray(data.content) ? data.content.find((block) => block && block.type === "text")?.text : "";
  return typeof text === "string" ? text : "";
}

export function createFallbackQuiz(week) {
  const concepts = week.concepts.slice(0, 5);
  return concepts.map((concept, index) => {
    const base = concept.toLowerCase();
    const optionSets = [
      [
        `Use ${base} to confirm the chart story before entering.`,
        `Treat ${base} as a reason to force a trade immediately.`,
        `Ignore ${base} when the market has no structure.`,
        `Replace ${base} with a guess about price direction.`,
      ],
      [
        `Wait for ${base} to be confirmed by context and rejection.`,
        `Enter before confirmation because the candle looks exciting.`,
        `Trade against ${base} to catch every top and bottom.`,
        `Use random sizing when ${base} appears.`,
      ],
      [
        `${concept} should be matched with structure and risk control.`,
        `${concept} means the setup is invalid no matter what.`,
        `${concept} is only useful after a trade is already closed.`,
        `${concept} should be ignored in journaling.`,
      ],
      [
        `Look for ${base} as evidence, not as a prediction machine.`,
        `Assume ${base} guarantees a win.`,
        `Use ${base} to widen your stop loss.`,
        `Skip ${base} if you want to improve consistency.`,
      ],
      [
        `The safest move is to study ${base} until the pattern becomes obvious.`,
        `The safest move is to trade every candle in sight.`,
        `The safest move is to ignore the higher timeframe entirely.`,
        `The safest move is to raise risk after a loss.`,
      ],
    ];

    const options = optionSets[index % optionSets.length].map((text, optionIndex) => `${String.fromCharCode(65 + optionIndex)}. ${text}`);
    return {
      question: `What is the best use of ${base}?`,
      options,
      answer: "A",
    };
  });
}

export function fallbackCoachMessage(score, total) {
  if (score === total) {
    return "Clean work. You are reading the market with more discipline now, so keep the process boring and repeatable.";
  }

  if (score >= Math.ceil(total * 0.8)) {
    return "Strong result. The next gain comes from slowing down, protecting the stop, and journaling the small misses.";
  }

  if (score >= Math.ceil(total * 0.5)) {
    return "You are building the shape of the skill. Tighten the process, revisit the missed concepts, and keep logging the charts.";
  }

  return "Good start. The market rewards patience, so return to the basics and let repetition do the heavy lifting.";
}

export function buildCoachPrompt({ currentWeek, currentPhase, recentConcepts }) {
  return `You are an FX trading coach helping a beginner learn price action and candlestick trading.
The student is on a 12-week program studying the Candlestick Trading Bible and Trade Chart Patterns Like The Pros.

Current progress: Week ${currentWeek}, Phase ${currentPhase}.
Recently completed concepts: ${recentConcepts.length ? recentConcepts.join(", ") : "No completed concepts yet."}

Rules:
- Keep answers concise (3-5 sentences max unless asked for detail)
- Always tie advice back to what they are currently studying
- Use trading vocabulary but explain terms when introduced
- Never recommend specific trades or predict price movement
- Encourage journaling and demo trading
- Be direct, not fluffy`;
}

export function makeCoachSystemPrompt(activePhaseId, completedMap) {
  const currentWeek = getCurrentWeekLabel(completedMap);
  const currentPhase = PHASES.find((phase) => phase.id === activePhaseId) || PHASES[0];
  const recentConcepts = getRecentCompletedConcepts(completedMap);

  return buildCoachPrompt({
    currentWeek: currentWeek.week,
    currentPhase: currentPhase.name,
    recentConcepts,
  });
}

export async function fetchAnthropicQuiz(week) {
  const prompt = `You are an FX trading quiz master. Generate exactly 5 multiple-choice questions testing understanding of these concepts: ${JSON.stringify(
    week.concepts
  )}.

Return ONLY a JSON array. No preamble. No markdown. Format:
[{
  "question": "...",
  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "answer": "A"
}]`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const data = await response.json();
  const text = parseAnthropicText(data) || "[]";
  return JSON.parse(stripCodeFences(text));
}

export async function fetchQuizMotivation({ week, score, total }) {
  const prompt = `Write one concise motivational message for a forex student who scored ${score}/${total} on a quiz about these concepts: ${JSON.stringify(
    week.concepts
  )}. Keep it to 1-2 sentences. No markdown.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const data = await response.json();
  return parseAnthropicText(data).trim();
}

export async function fetchAnthropicCoachReply({ systemPrompt, history, userMessage }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        ...history,
        {
          role: "user",
          content: userMessage,
        },
      ],
    }),
  });

  const data = await response.json();
  return parseAnthropicText(data).trim();
}
