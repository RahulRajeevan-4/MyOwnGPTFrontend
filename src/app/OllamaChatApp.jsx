import React from "react";
import { useOllamaChat } from "../hooks/useOllamaChat";
import HeaderBar from "../components/HeaderBar";
import ChatWindow from "../components/ChatWindow";
import Composer from "../components/Composer";
import "./OllamaChatApp.css";

export default function OllamaChatApp() {
  const {
    chatRef,
    chat,
    status,
    apiUrl,
    setApiUrl,
    model,
    setModel,
    prompt,
    setPrompt,
    send,
    onPromptKeyDown,
  } = useOllamaChat();

  return (
    <div className="wrap">
      <HeaderBar status={status} />
      <ChatWindow chatRef={chatRef} chat={chat} />
      <Composer
        prompt={prompt}
        setPrompt={setPrompt}
        onPromptKeyDown={onPromptKeyDown}
        apiUrl={apiUrl}
        setApiUrl={setApiUrl}
        model={model}
        setModel={setModel}
        send={send}
        disabled={status !== "idle"}
      />
    </div>
  );
}
