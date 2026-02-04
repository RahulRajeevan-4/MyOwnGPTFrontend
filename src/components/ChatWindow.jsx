import React from "react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ chatRef, chat }) {
  return (
    <main className="chat" ref={chatRef}>
      {chat.map((m, idx) => (
        <MessageBubble key={m.id || idx} role={m.role} content={m.content} />
      ))}
    </main>
  );
}
