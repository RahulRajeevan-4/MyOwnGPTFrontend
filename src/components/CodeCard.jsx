import React, { useMemo, useState } from "react";
import Prism from "../utils/prism";
import { prismLang } from "../utils/markdownFences";

export default function CodeCard({ lang, code }) {
  const language = prismLang(lang);

  const highlighted = useMemo(() => {
    const grammar = Prism.languages[language] || Prism.languages.markup;
    return Prism.highlight(code, grammar, language);
  }, [code, language]);

  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      alert("Copy failed. Your browser may block clipboard access.");
    }
  };

  return (
    <div className="code-card">
      <div className="code-head">
        <div className="lang">{lang}</div>
        <button className="copy-btn" type="button" onClick={onCopy}>
          <span style={{ opacity: 0.9 }}>{copied ? "✓" : "⧉"}</span>
          <span>{copied ? "Copied" : "Copy code"}</span>
        </button>
      </div>

      <pre>
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}
