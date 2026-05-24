export function getPipFactor(pair) {
  const normalized = String(pair || "").toUpperCase();
  if (normalized.includes("JPY")) return 100;
  if (normalized.includes("XAU")) return 10;
  if (normalized.includes("BTC")) return 1;
  if (normalized.includes("NGN")) return 1000;
  return 10000;
}

export function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function calculateTradeMetrics(trade) {
  const entry = toNumber(trade.entry);
  const sl = toNumber(trade.sl);
  const tp = toNumber(trade.tp);
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  const factor = getPipFactor(trade.pair);
  const riskPips = risk ? risk * factor : 0;
  const rewardPips = reward ? reward * factor : 0;
  const rr = riskPips ? rewardPips / riskPips : 0;

  let pips = 0;
  if (trade.outcome === "WIN") pips = rewardPips;
  if (trade.outcome === "LOSS") pips = -riskPips;

  return {
    rr,
    pips,
    riskPips,
    rewardPips,
  };
}

export function formatDecimal(value, digits = 1) {
  if (!Number.isFinite(value)) return "0.0";
  return value.toFixed(digits);
}

export function formatPips(value) {
  if (!Number.isFinite(value)) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value)} pips`;
}

export function tradeStatsForWeek(trades, weekId) {
  const items = trades.filter((trade) => trade.weekId === weekId);
  const closed = items.filter((trade) => trade.outcome === "WIN" || trade.outcome === "LOSS");
  const wins = closed.filter((trade) => trade.outcome === "WIN").length;
  const winRate = closed.length ? Math.round((wins / closed.length) * 100) : 0;
  const rrValues = items.map((trade) => calculateTradeMetrics(trade).rr).filter((value) => value > 0);
  const avgRR = rrValues.length ? rrValues.reduce((sum, value) => sum + value, 0) / rrValues.length : 0;

  return [
    { label: "Win Rate", value: `${winRate}%` },
    { label: "Avg RR", value: rrValues.length ? `${formatDecimal(avgRR, 2)}R` : "-" },
  ];
}
