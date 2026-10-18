import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  Mic,
  MicOff,
  Send,
  Square,
  Play,
  Volume2,
  VolumeX,
  Clock3,
  ChevronDown,
  Check,
  CalendarDays,
} from "lucide-react";
import { useApp } from "../state/AppContext";
import { PageTitle, Badge, Field, SectionHead } from "../components/ui";
import { speechSupported } from "../services/speech";
import { formatSlot } from "../domain/time";
export default function Agent() {
  const app = useApp(),
    {
      data,
      conversation,
      active,
      busy,
      status,
      dialogue,
      start,
      end,
      send,
      speech,
      perform,
    } = app;
  const [input, setInput] = useState(""),
    [draft, setDraft] = useState(() => structuredClone(data.config.agent)),
    [seconds, setSeconds] = useState(0),
    [saving, setSaving] = useState(false),
    tail = useRef();
  useEffect(() => {
    setDraft(structuredClone(data.config.agent));
  }, [data.config.agent]);
  useEffect(() => {
    if (!active) return;
    const update = () =>
      setSeconds(
        Math.floor((Date.now() - Date.parse(conversation.startedAt)) / 1000),
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [active, conversation?.startedAt]);
  useEffect(() => {
    tail.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [conversation?.messages.length, busy]);
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await perform(
        (r) => r.saveConfig({ ...data.config, agent: draft }),
        "Receptionist configuration saved.",
      );
    } catch {
    } finally {
      setSaving(false);
    }
  }
  function submit(e) {
    e.preventDefault();
    if (!input.trim() || busy || !active) return;
    const text = input;
    setInput("");
    send(text);
  }
  return (
    <>
      <PageTitle
        eyebrow="THE VOICE OF YOUR BUSINESS"
        title="A good conversation starts here."
        description="Let your receptionist turn a request into something done."
      />
      <div className="agent-layout">
        <section className="voice-stage panel">
          <div className="voice-stage-top">
            <Badge type={active ? "green" : "neutral"}>
              <i />
              {active ? status : "Standby"}
            </Badge>
            <span className="timer">
              <Clock3 size={14} />
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")}
            </span>
          </div>
          <div className={`voice-portrait ${active ? "awake" : ""}`}>
            <div />
            <div />
            <span>
              <AudioLines size={64} strokeWidth={1.3} />
            </span>
          </div>
          <h2>{data.config.agent.name}, at your service.</h2>
          <p>
            {active
              ? status === "Listening"
                ? "Listening. Take your time."
                : busy
                  ? "Taking care of that…"
                  : "What can I help you with?"
              : "A warm welcome. A capable pair of hands."}
          </p>
          <div className="voice-stage-controls">
            {!active ? (
              <button className="button" disabled={busy} onClick={start}>
                <Play size={16} /> Start conversation
              </button>
            ) : (
              <>
                <button
                  className={`mic-button ${status === "Listening" ? "listening" : ""}`}
                  aria-label={
                    status === "Listening"
                      ? "Stop listening"
                      : "Start listening"
                  }
                  disabled={busy}
                  onClick={() =>
                    status === "Listening"
                      ? speech.current.stopListening()
                      : speech.current.listen()
                  }
                >
                  {status === "Listening" ? (
                    <MicOff size={22} />
                  ) : (
                    <Mic size={22} />
                  )}
                </button>
                <button
                  className="button end-button"
                  disabled={busy}
                  onClick={end}
                >
                  <Square size={14} /> End conversation
                </button>
              </>
            )}
          </div>
          <span className="voice-stage-note">
            {speechSupported()
              ? "Speak with your mic, or type in the conversation."
              : "Speech recognition unavailable. Use the full text experience."}
          </span>
          <div className="voice-capabilities">
            <span>
              <CalendarDays size={14} /> Books appointments
            </span>
            <span>
              <Check size={14} /> Answers questions
            </span>
          </div>
        </section>
        <section className="panel transcript-panel">
          <SectionHead
            title="Live conversation"
            subtitle={
              active
                ? "Your conversation is saved as you go."
                : "Your next hello goes here."
            }
          >
            <Badge>Text + voice</Badge>
          </SectionHead>
          <div
            className="transcript"
            aria-live="polite"
            role="log"
            aria-label="Conversation transcript"
          >
            {!conversation ? (
              <div className="transcript-empty">
                <MessageIcon />
                <h3>Let’s make something happen.</h3>
                <p>
                  Start a conversation, then ask a question
                  <br />
                  or book your first appointment.
                </p>
                <div className="prompt-examples">
                  <span>“What services do you offer?”</span>
                  <span>“Book a consultation tomorrow at 4 PM.”</span>
                </div>
              </div>
            ) : (
              conversation.messages.map((m) => (
                <div className={`message ${m.role}`} key={m.id}>
                  <span className="message-avatar">
                    {m.role === "assistant" ? <AudioLines size={15} /> : <>Y</>}
                  </span>
                  <div>
                    <div className="message-label">
                      {m.role === "assistant" ? data.config.agent.name : "You"}
                      <time>
                        {new Date(m.at).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <p>{m.text}</p>
                  </div>
                </div>
              ))
            )}
            {busy && <div className="thinking">Saving and checking…</div>}
            <div ref={tail} />
          </div>
          <form className="chat-form" onSubmit={submit}>
            <input
              aria-label="Message receptionist"
              placeholder={
                active
                  ? "Type a message…"
                  : "Start a conversation to say hello…"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={!active || busy}
              maxLength={1000}
            />
            <button
              className="send-button"
              aria-label="Send message"
              disabled={!active || busy || !input.trim()}
            >
              <Send size={18} />
            </button>
          </form>
          <div className="transcript-foot">
            <span>
              <i className="status-dot" />{" "}
              {active
                ? "Conversation active"
                : "Ready for your next conversation"}
            </span>
            <span>Browser voice · no phone calls</span>
          </div>
        </section>
      </div>
      {dialogue.phase === "confirm" && (
        <div className="notice proposal">
          <CalendarDays size={20} />
          <span>
            <strong>Ready for your confirmation</strong> ·{" "}
            {
              data.config.services.find(
                (s) => s.id === dialogue.draft.serviceId,
              )?.name
            }{" "}
            for {dialogue.draft.customer},{" "}
            {formatSlot(dialogue.proposal.start, data.config.timezone)}
          </span>
          <button
            className="button small"
            disabled={busy}
            onClick={() => send("confirm")}
          >
            Confirm booking <Check size={15} />
          </button>
        </div>
      )}
      <section className="panel agent-config">
        <SectionHead
          title="Make it your own"
          subtitle="A receptionist that sounds like your business."
        >
          <Badge>Saved configuration</Badge>
        </SectionHead>
        <form onSubmit={save}>
          <div className="form-grid">
            <Field label="Receptionist name">
              <input
                required
                maxLength={40}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label="Conversation style">
              <select
                value={draft.tone}
                onChange={(e) => setDraft({ ...draft, tone: e.target.value })}
              >
                <option>Warm and professional</option>
                <option>Concise and helpful</option>
                <option>Friendly and welcoming</option>
              </select>
            </Field>
            <Field
              label="Welcome message"
              hint="Use {business} and {agent} to keep the greeting in sync with your settings."
            >
              <textarea
                required
                rows={3}
                maxLength={500}
                value={draft.greeting}
                onChange={(e) =>
                  setDraft({ ...draft, greeting: e.target.value })
                }
              />
            </Field>
            <div className="speech-setting">
              <div>
                {draft.speak ? <Volume2 size={22} /> : <VolumeX size={22} />}
                <strong>Speak responses aloud</strong>
              </div>
              <p>
                Uses your browser’s built-in speech synthesis. You control when
                the microphone listens.
              </p>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={draft.speak}
                  onChange={(e) =>
                    setDraft({ ...draft, speak: e.target.checked })
                  }
                />{" "}
                Enable spoken replies
              </label>
            </div>
          </div>
          <div className="form-footer">
            <span>Business services and working hours live in Settings.</span>
            <button className="button small" disabled={saving}>
              {saving ? "Saving…" : "Save configuration"}
            </button>
          </div>
        </form>
      </section>
      <p className="data-note">
        This receptionist uses a deterministic intent engine. Speech recognition
        may use your browser vendor’s network service. SMS confirmations are
        previews only.
      </p>
    </>
  );
}
function MessageIcon() {
  return (
    <span className="empty-message-icon">
      <AudioLines size={26} />
    </span>
  );
}
