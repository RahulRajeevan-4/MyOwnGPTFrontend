import React from "react";

export default function HeaderBar({ status }) {
  return (
    <header>
      <div>
        <div className="title">Ollama Chat UI</div>
        <div className="meta">MERN-style frontend → Express → Ollama</div>
      </div>
      <div className="meta">{status}</div>
    </header>
  );
}
