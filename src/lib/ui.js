export function joinClassNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

export function truncate(text, max = 90) {
  const content = String(text || "");
  if (content.length <= max) return content;
  return `${content.slice(0, max - 1)}...`;
}

export function highlightText(text, query) {
  const content = String(text ?? "");
  const needle = String(query ?? "").trim();
  if (!needle) return content;

  const lowerContent = content.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const firstIndex = lowerContent.indexOf(lowerNeedle);
  if (firstIndex === -1) return content;

  const before = content.slice(0, firstIndex);
  const match = content.slice(firstIndex, firstIndex + needle.length);
  const after = content.slice(firstIndex + needle.length);

  return { before, match, after };
}
