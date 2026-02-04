import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeCard from "./CodeCard";
import Prism from "../utils/prism";
import { prismLang } from "../utils/markdownFences";

function normalizeLang(className) {
  if (!className) return "code";
  const m = /language-([\w-]+)/.exec(className);
  return (m?.[1] || "code").toLowerCase();
}

// Heuristic: treat tiny fenced blocks as inline-highlight, not a big code card
function shouldInlineifyFencedBlock(codeString, lang) {
  const oneLine = !codeString.includes("\n");
  const trimmed = codeString.trim();

  // tweak these thresholds as you like:
  const SHORT_CHAR_LIMIT = 28; // <= 28 chars becomes inline
  const SHORT_WORD_LIMIT = 2;  // 1–2 words becomes inline

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const looksLikeIdentifier = /^[A-Za-z_$][\w$]*$/.test(trimmed);

  // If it's just "inner" or "functionOuter" etc → inline highlight
  if (oneLine && (looksLikeIdentifier || (trimmed.length <= SHORT_CHAR_LIMIT && wordCount <= SHORT_WORD_LIMIT))) {
    return true;
  }

  // If model uses ```code for tiny snippet, still inlineify
  if (oneLine && lang === "code" && trimmed.length <= SHORT_CHAR_LIMIT) {
    return true;
  }

  return false;
}

function InlineHighlighted({ lang, code }) {
  const language = prismLang(lang);
  const grammar = Prism.languages[language] || Prism.languages.markup;

  const highlighted = Prism.highlight(code, grammar, language);

  return (
    <code
      className="md-inline-code md-inline-code--blocklike"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

export default function MessageBubble({ role, content }) {
  const markdown = useMemo(() => content ?? "", [content]);

  return (
    <div className={`msg ${role === "user" ? "user" : "ai"}`}>
      <div className="bubble">
        <div className="small">{role === "user" ? "You" : "Assistant"}</div>

        <div className="md">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: (props) => <h1 className="md-h1" {...props} />,
              h2: (props) => <h2 className="md-h2" {...props} />,
              h3: (props) => <h3 className="md-h3" {...props} />,
              h4: (props) => <h4 className="md-h4" {...props} />,
              p: (props) => <p className="md-p" {...props} />,
              ul: (props) => <ul className="md-ul" {...props} />,
              ol: (props) => <ol className="md-ol" {...props} />,
              li: (props) => <li className="md-li" {...props} />,
              blockquote: (props) => <blockquote className="md-quote" {...props} />,
              a: (props) => (
                <a className="md-a" target="_blank" rel="noreferrer" {...props} />
              ),

              code({ inline, className, children, ...props }) {
                const codeString = String(children || "").replace(/\n$/, "");
                const lang = normalizeLang(className);

                // normal inline code: `like this`
                if (inline) {
                  return (
                    <code className="md-inline-code" {...props}>
                      {codeString}
                    </code>
                  );
                }

                // fenced code block: ```lang ... ```
                // ✅ NEW: if it’s tiny, render as inline-highlight instead of big CodeCard
                if (shouldInlineifyFencedBlock(codeString, lang)) {
                  return <InlineHighlighted lang={lang} code={codeString.trim()} />;
                }

                // otherwise render big code card
                return <CodeCard lang={lang} code={codeString} />;
              },
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
