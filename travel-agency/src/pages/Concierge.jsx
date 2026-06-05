import { useState, useRef, useEffect } from "react";
import { PACKAGES } from "../data/data";
import styles from "./Concierge.module.css";

const SYSTEM = `You are Voyage, an expert AI travel concierge for a luxury travel agency. Help clients find perfect travel packages, answer destination questions, visa requirements, best seasons, packing tips, and cultural etiquette. Be warm, knowledgeable, and concise — under 120 words. Available packages: ${PACKAGES.map(p => `${p.name} (${p.destination}, ${p.duration}, $${p.price})`).join(", ")}.`;

const SUGGESTIONS = [
  "Best time to visit Japan 🌸",
  "Safari vs beach holiday?",
  "Budget tips for Santorini",
  "Visa for Patagonia?",
];

async function askClaude(messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM,
      messages,
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "I'm having trouble connecting. Please try again.";
}

export default function Concierge() {
  const [msgs, setMsgs]       = useState([
    { role: "assistant", content: "Hello! I'm Voyage, your personal travel concierge. Tell me where you dream of going — I'm here to craft your perfect journey. ✈️" },
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  const send = async (text) => {
    const content = text || input.trim();
    if (!content || loading) return;
    const userMsg = { role: "user", content };
    const updated = [...msgs, userMsg];
    setMsgs(updated);
    setInput("");
    setLoading(true);
    try {
      const reply = await askClaude(updated);
      setMsgs((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMsgs((prev) => [...prev, { role: "assistant", content: "Sorry, I hit a snag. Please try again!" }]);
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.container}>
        <h1 className={styles.title}>Your personal<br />travel concierge</h1>
        <p className={styles.sub}>Ask about destinations, get packing advice, compare packages, or plan your perfect itinerary.</p>

        <div className={styles.chatWindow}>
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
                <div className={styles.typing}><span/><span/><span/></div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className={styles.inputRow}>
          <input
            className={styles.chatInput}
            placeholder="Ask about any destination, package, or travel tip…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          />
          <button
            className={styles.sendBtn}
            onClick={() => send()}
            disabled={loading || !input.trim()}
          >Send</button>
        </div>

        <div className={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <button key={s} className={styles.suggestion} onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
