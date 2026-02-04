export const LS_KEY = "ollama_last_chat";

export function saveLastToLocalStorage(userText, assistantText) {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({ userText, assistantText, ts: Date.now() })
  );
}

export function loadLastFromLocalStorage() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "null");
  } catch {
    return null;
  }
}
