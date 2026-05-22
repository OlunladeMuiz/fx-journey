export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromKey(key) {
  const [year, month, day] = String(key || "").split("-").map(Number);
  return new Date(year || 0, (month || 1) - 1, day || 1);
}

export function dayDiff(a, b) {
  const ms = dateFromKey(b).getTime() - dateFromKey(a).getTime();
  return Math.round(ms / 86400000);
}
