import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorMessage } from "../api/client";
import type { ChatMessage } from "../types";
import styles from "./Concierge.module.css";

const SUGGESTIONS = [
  "Best time to visit Japan 🌸",
  "Safari vs beach holiday?",
  "Budget tips for Santorini",
  "Which package suits a first-time traveller?",
];

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hello! I'm Voyage, an AI travel concierge. Ask me about destinations, the best seasons to go, or which of our sample packages might suit you. ✈️",
};

// The API accepts at most 20 messages; keep recent context only.
const MAX_HISTORY = 12;

export default function Concierge() {
  const [msgs, setMsgs] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const updated: ChatMessage[] = [...msgs, { role: "user", content }];
    setMsgs(updated);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await api.askConcierge(updated.slice(-MAX_HISTORY));
      setMsgs((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMsgs((prev) => [...prev, { role: "assistant", content: errorMessage(err) }]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(); };

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.container}>
        <h1 className={styles.title}>Your AI<br />travel concierge</h1>
        <p className={styles.sub}>
          Ask about destinations, packing, seasons or our sample packages. Answers are AI-generated and can be wrong,
          so check visa and health rules with official sources.
        </p>

        <div className={styles.chatWindow} role="log" aria-live="polite" aria-label="Conversation">
          {msgs.map((m, i) => (
            <div key={i} className={`${styles.msg} ${m.role === "user" ? styles.msgUser : ""}`}>
              <div className={`${styles.avatar} ${m.role === "user" ? styles.avatarUser : styles.avatarAi}`}>
                {m.role === "user" ? "You" : "V"}
              </div>
              <div className={`${styles.bubble} ${m.role === "user" ? styles.bubbleUser : styles.bubbleAi}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className={styles.msg}>
              <div className={`${styles.avatar} ${styles.avatarAi}`}>V</div>
              <div className={`${styles.bubble} ${styles.bubbleAi}`}>
                <div className={styles.typing}><span /><span /><span /></div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form className={styles.inputRow} onSubmit={onSubmit}>
          <input
            className={styles.chatInput}
            aria-label="Your message"
            placeholder="Ask about any destination, package, or travel tip…"
            maxLength={500}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className={styles.sendBtn} type="submit" disabled={loading || !input.trim()}>Send</button>
        </form>

        <div className={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className={styles.suggestion} onClick={() => void send(s)} disabled={loading}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
