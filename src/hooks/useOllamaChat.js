import { useEffect, useRef, useState } from "react";
import { loadLastFromLocalStorage, saveLastToLocalStorage } from "../utils/storage";

const CODING_SUFFIX =
  "Explain like you’re teaching a beginner developer, but keep it technically correct in 300 words. " +
  "Requirements: Start with a simple definition in 1–2 lines. Use an analogy. Give 3 code examples. " +
  "Include var-for-loop setTimeout gotcha and fix using let. After each code block, explain in bullets. " +
  "End with a one-line definition to memorize. Use headings.";

function toStreamUrl(apiUrl) {
  return apiUrl.trim().replace(/\/chat$/, "/chat-stream");
}

function toChatUrl(apiUrl) {
  // ensures classifier uses /chat (non-stream)
  return apiUrl.trim().replace(/\/chat-stream$/, "/chat");
}

// --- AI classifier prompt (forces strict JSON)
function buildClassifierMessages(userText) {
  return [
    {
      role: "system",
      content:
        "You are a strict classifier. Decide if the user's question is coding/software-development related. " +
        "Return ONLY valid JSON with exactly: {\"isCoding\": true|false}. No extra keys, no commentary.",
    },
    {
      role: "user",
      content: userText,
    },
  ];
}

function safeParseIsCoding(text) {
  // Try direct JSON parse first
  try {
    const obj = JSON.parse(text);
    if (typeof obj?.isCoding === "boolean") return obj.isCoding;
  } 
  catch {
    console.log("Nothing")
  }

  // Fallback: extract {...} from noisy text
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      if (typeof obj?.isCoding === "boolean") return obj.isCoding;
    } catch {
        console.log("Nothing")
    }
  }

  // Final fallback: look for true/false keywords
  const lower = (text || "").toLowerCase();
  if (lower.includes("true")) return true;
  if (lower.includes("false")) return false;

  // Default: assume non-coding
  return false;
}

export function useOllamaChat() {
  const chatRef = useRef(null);

  const [status, setStatus] = useState("idle");
  const [apiUrl, setApiUrl] = useState("http://localhost:3000/api/ai/chat");
  const [model, setModel] = useState("dolphin-llama3");
  const [prompt, setPrompt] = useState("");

  // ✅ expose this to UI: "code" or "article"
  const [uiMode, setUiMode] = useState("code");

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
          "Hi! Ask me anything. If it’s coding-related, code blocks will appear in a code card with a Copy button.",
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

  // ✅ Two-call flow:
  // 1) classify (non-stream)
  // 2) stream answer
  const classifyIsCoding = async (userText) => {
    const url = toChatUrl(apiUrl);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model.trim() || "dolphin-llama3",
        messages: buildClassifierMessages(userText),
        // optional: if your backend supports options like temperature
        // options: { temperature: 0 }
      }),
    });

    if (!res.ok) {
      // if classifier fails, fallback to false
      return false;
    }

    const data = await res.json();

    // Adjust this depending on your backend response shape:
    // common shapes:
    // - { content: "..." }
    // - { message: { content: "..." } }
    const text =
      data?.content ??
      data?.message?.content ??
      (typeof data === "string" ? data : "");

    return safeParseIsCoding(String(text));
  };

  const send = async () => {
    const userText = prompt.trim();
    if (!userText) return;

    setStatus("thinking…");
    setPrompt("");

    // show user
    setChat((prev) => [...prev, { role: "user", content: userText }]);

    const assistantId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());

    // placeholder assistant message
    setChat((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    let assistantText = "";

    try {
      // -------- 1) Classify ----------
      const isCoding = await classifyIsCoding(userText);

      // ✅ set UI mode based on classifier
      setUiMode(isCoding ? "code" : "article");

      // -------- 2) Build final prompt ----------
      const finalUserPrompt = isCoding ? `${userText}\n\n${CODING_SUFFIX}` : userText;

      const nextMessages = [...messages, { role: "user", content: finalUserPrompt }];
      setMessages(nextMessages);

      // -------- 3) Stream answer ----------
      const streamUrl = toStreamUrl(apiUrl);
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

      // store assistant reply in context
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
    uiMode, // ✅ use this in UI to switch styles
  };
}
