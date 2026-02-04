export function parseMarkdownFences(text) {
  const fenceRegex = /```([\w-]+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  const segments = [];
  let match;

  while ((match = fenceRegex.exec(text)) !== null) {
    const [full, langRaw, codeRaw] = match;
    const start = match.index;

    const before = text.slice(lastIndex, start);
    if (before.trim().length) segments.push({ type: "text", content: before });

    const lang = (langRaw || "code").toLowerCase();
    const code = codeRaw.replace(/\n$/, "");
    segments.push({ type: "code", lang, code });

    lastIndex = start + full.length;
  }

  const after = text.slice(lastIndex);
  if (after.trim().length) segments.push({ type: "text", content: after });

  if (!segments.length) segments.push({ type: "text", content: text });

  return segments;
}

export function prismLang(lang) {
  if (lang === "js") return "javascript";
  return lang;
}
