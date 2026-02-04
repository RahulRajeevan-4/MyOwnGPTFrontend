import { useEffect, useRef, useState } from "react";
import { loadLastFromLocalStorage, saveLastToLocalStorage } from "../utils/storage";

export function useOllamaChat() {
  const chatRef = useRef(null);

  const [status, setStatus] = useState("idle");
  const [apiUrl, setApiUrl] = useState("http://localhost:3000/api/ai/chat");
  const [model, setModel] = useState("dolphin-llama3");
  const [prompt, setPrompt] = useState("");

  const [messages, setMessages] = useState([
    {
      role: "system",
      content:
        "You are a helpful assistant. When you include code, ALWAYS wrap it in markdown code fences like ```js ... ``` so the UI can render it nicely.",
    },
  ]);

  const [chat, setChat] = useState(() => {
    const last = loadLastFromLocalStorage();
    if (last?.userText && last?.assistantText) {
      return [
        { role: "user", content: last.userText },
        { role: "assistant", content: last.assistantText },
      ];
    }
    return [
      {
        role: "assistant",
        content:
          "Hi! Ask me anything. If I return code blocks, they’ll appear in a code card with a Copy button.\n\nExample:\n```js\nconsole.log('hello')\n```",
      },
    ];
  });

  const scrollToBottom = () => {
    const el = chatRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  const buildPrompt1 = (userText) =>
    userText +
    "\n\n" +
    "Explain like you’re teaching a beginner developer, but keep it technically correct in 300 words. " +
    "Requirements: Start with a simple definition in 1–2 lines. Use an analogy. Give 3 code examples. " +
    "Include var-for-loop setTimeout gotcha and fix using let. After each code block, explain in bullets. " +
    "End with a one-line definition to memorize. Use headings.";

  const send = async () => {
    const userText = prompt.trim();
    if (!userText) return;

    setStatus("thinking…");
    setPrompt("");

    setChat((prev) => [...prev, { role: "user", content: userText }]);

    const assistantId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());

    setChat((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    const prompt1 = buildPrompt1(userText);
    let assistantText = "";

    try {
      const nextMessages = [...messages, { role: "user", content: prompt1 }];
      setMessages(nextMessages);

      const streamUrl = apiUrl.trim().replace(/\/chat$/, "/chat-stream");
      const modelToUse = model.trim() || "dolphin-llama3";

      const res = await fetch(streamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, model: modelToUse }),
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        const errorText = `Error: ${err || "Streaming failed"}`;
        setChat((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: errorText } : m))
        );
        setStatus("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;

            let obj;
            try {
              obj = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            const chunk = obj?.message?.content ?? "";
            if (chunk) {
              assistantText += chunk;
              setChat((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: assistantText } : m))
              );
            }

            if (obj?.done) break;
          }
        }
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
      saveLastToLocalStorage(userText, assistantText);
      setStatus("idle");
    } catch (e) {
      const errorText = `Error: ${e?.message || "Network error"}`;
      setChat((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: errorText } : m))
      );
      setStatus("error");
    }
  };

  const onPromptKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return {
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
  };
}
