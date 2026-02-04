import React from "react";

export default function Composer({
  prompt,
  setPrompt,
  onPromptKeyDown,
  apiUrl,
  setApiUrl,
  model,
  setModel,
  send,
  disabled,
}) {
  return (
    <footer className="composer">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={onPromptKeyDown}
        placeholder="Type your question… (Shift+Enter = new line, Enter = send)"
      />

      <div className="controls">
        <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} />
        <div className="row">
          <input type="text" value={model} onChange={(e) => setModel(e.target.value)} />
        </div>

        <button className="send" onClick={send} disabled={disabled}>
          Send
        </button>

        <div className="hint">Tip: change API URL/model here.</div>
      </div>
    </footer>
  );
}
