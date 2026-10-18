import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
  Check,
  CalendarDays,
  ArrowUpRight,
  MessageSquare,
  Download,
  ShieldCheck,
  AlertCircle,
  Settings2,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useApp } from "../state/AppContext";
import { PageTitle, Badge, Field, SectionHead } from "../components/ui";
import { speechSupported } from "../services/speech";
import { formatSlot } from "../domain/time";
export default function Agent() {
  const app = useApp();
  const {
    data,
    conversation,
    active,
    busy,
    status,
    dialogue,
    start,
    end,
    send,
    perform,
    voiceMode,
    engine,
    voiceError,
    interim,
    level,
    model,
    spoken,
    startVoice,
    toggleListening,
    pauseVoice,
    toggleSpoken,
    chooseEngine,
    replay,
  } = app;
  const [input, setInput] = useState(""),
    [draft, setDraft] = useState(() => structuredClone(data.config.agent)),
    [seconds, setSeconds] = useState(0),
    [saving, setSaving] = useState(false),
    transcript = useRef(),
    composer = useRef();
  useEffect(
    () => setDraft(structuredClone(data.config.agent)),
    [data.config.agent],
  );
  useEffect(() => {
    if (!conversation) {
      setSeconds(0);
      return;
    }
    const update = () =>
      setSeconds(
        Math.max(
          0,
          Math.floor(
            ((conversation.endedAt
              ? Date.parse(conversation.endedAt)
              : Date.now()) -
              Date.parse(conversation.startedAt)) /
              1000,
          ),
        ),
      );
    update();
    if (!active) return;
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [active, conversation?.startedAt, conversation?.endedAt]);
  useEffect(() => {
    const container = transcript.current;
    if (container && conversation?.messages.length)
      container.scrollTop = container.scrollHeight;
  }, [conversation?.messages.length, busy, interim]);
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
  async function beginText() {
    await start();
    requestAnimationFrame(() => {
      composer.current?.focus({ preventScroll: true });
      if (window.matchMedia("(max-width:760px)").matches)
        composer.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    });
  }
  function submit(e) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const text = input;
    setInput("");
    send(text);
  }
  const steps = [
    ["Service", !!dialogue.draft.serviceId],
    ["Customer", !!dialogue.draft.customer],
    ["Date & time", !!(dialogue.draft.date && dialogue.draft.time)],
    ["Confirm", dialogue.phase === "confirm"],
  ];
  const booked = [...data.appointments]
    .reverse()
    .find(
      (a) => a.conversationId === conversation?.id && a.status === "confirmed",
    );
  const preparing = model.state === "loading" && engine === "device";
  return (
    <>
      <PageTitle
        eyebrow="YOUR AI RECEPTION DESK"
        title="Let’s turn a conversation into a booking."
        description={`Talk to ${data.config.agent.name} or type below. Your services, calendar, and confirmations stay connected.`}
        action={
          <Badge type={active ? "green" : "neutral"}>
            <i />
            {active ? "Conversation active" : "Ready when you are"}
          </Badge>
        }
      />
      <div className="agent-layout">
        <section className="panel transcript-panel">
          <SectionHead
            title="Conversation"
            subtitle={`${data.config.name} · ${data.config.timezone}`}
          >
            <div className="conversation-tools">
              <button
                className="icon-button"
                aria-label={
                  spoken ? "Mute spoken replies" : "Enable spoken replies"
                }
                title={spoken ? "Mute spoken replies" : "Enable spoken replies"}
                onClick={toggleSpoken}
              >
                {spoken ? <Volume2 size={19} /> : <VolumeX size={19} />}
              </button>
              {conversation && (
                <button
                  className="button secondary small"
                  onClick={replay}
                  disabled={busy}
                >
                  <Play size={14} /> Play reply
                </button>
              )}
            </div>
          </SectionHead>
          <div
            className="transcript"
            tabIndex={0}
            ref={transcript}
            role="log"
            aria-live="polite"
            aria-label="Conversation transcript"
          >
            {!conversation ? (
              <div className="transcript-empty">
                <span className="chat-welcome-icon">
                  <AudioLines size={32} />
                </span>
                <Badge type="green">
                  {data.config.agent.name} is ready to help
                </Badge>
                <h2>What can we take care of?</h2>
                <p>
                  Ask about a service, find an available time,
                  <br />
                  or book your next appointment.
                </p>
                <div className="prompt-examples">
                  {[
                    "What services do you offer?",
                    "Book a consultation tomorrow at 4 PM",
                    "What are your opening hours?",
                  ].map((text) => (
                    <button key={text} onClick={() => send(text)}>
                      {text}
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              conversation.messages.map((m) => (
                <div className={`message ${m.role}`} key={m.id}>
                  <span className="message-avatar">
                    {m.role === "assistant" ? <AudioLines size={18} /> : "Y"}
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
            {interim && (
              <div className="interim-message">
                <Mic size={15} />
                <span>{interim}</span>
              </div>
            )}
            {busy && (
              <div className="thinking">
                <LoaderCircle size={16} className="spin" /> Checking and saving
                your request…
              </div>
            )}
            {booked && dialogue.phase === "idle" && (
              <Link
                className="booking-success-card"
                to={`/app/appointments?booking=${booked.id}`}
              >
                <span>
                  <Check size={23} />
                </span>
                <div>
                  <strong>Your appointment is saved</strong>
                  <p>
                    {booked.serviceName} ·{" "}
                    {formatSlot(booked.start, data.config.timezone)}
                  </p>
                  <small>View booking & simulated SMS confirmation</small>
                </div>
                <ArrowUpRight size={20} />
              </Link>
            )}
          </div>
          {dialogue.phase === "confirm" && (
            <div className="booking-review">
              <div>
                <CalendarDays size={20} />
                <span>
                  <strong>Review before we book</strong>
                  <small>
                    {dialogue.draft.customer} ·{" "}
                    {formatSlot(dialogue.proposal.start, data.config.timezone)}
                  </small>
                </span>
              </div>
              <button
                className="button"
                disabled={busy}
                onClick={() => send("confirm")}
              >
                <Check size={17} /> Confirm booking
              </button>
            </div>
          )}
          {dialogue.alternatives.length > 0 && dialogue.phase !== "confirm" && (
            <div className="inline-slots">
              <strong>Choose an available time</strong>
              {dialogue.alternatives.map((slot, i) => (
                <button
                  className="button secondary small"
                  key={slot.start}
                  disabled={busy}
                  onClick={() => send(String(i + 1))}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
          <form className="chat-form" onSubmit={submit}>
            <label className="sr-only" htmlFor="receptionist-message">
              Message receptionist
            </label>
            <input
              ref={composer}
              id="receptionist-message"
              placeholder="Ask a question or request an appointment…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              maxLength={1000}
            />
            <button
              className="send-button"
              aria-label="Send message"
              disabled={busy || !input.trim()}
            >
              <Send size={20} />
            </button>
          </form>
          <div className="transcript-foot">
            <span>
              <ShieldCheck size={14} /> Saved to your{" "}
              {app.repository.mode === "demo"
                ? "local demo"
                : "cloud workspace"}
            </span>
            <span>Enter to send</span>
          </div>
        </section>
        <aside className="voice-panel">
          <section
            className={`panel voice-stage ${voiceMode ? "voice-active" : ""}`}
          >
            <div className="voice-stage-top">
              <Badge
                type={
                  status === "Listening"
                    ? "green"
                    : status === "Unavailable"
                      ? "red"
                      : "neutral"
                }
              >
                <i />
                {status}
              </Badge>
              <span className="timer">
                <Clock3 size={15} />
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                {String(seconds % 60).padStart(2, "0")}
              </span>
            </div>
            <div className="voice-identity">
              <div className={`voice-portrait ${voiceMode ? "awake" : ""}`}>
                <AudioLines size={42} />
              </div>
              <div>
                <h2>{data.config.agent.name}, at your service.</h2>
                <p>Your voice receptionist</p>
              </div>
            </div>
            <div
              className="voice-meter"
              role="img"
              aria-label={
                status === "Listening"
                  ? "Microphone is listening"
                  : "Microphone is not recording"
              }
            >
              {Array.from({ length: 23 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    height:
                      status === "Listening"
                        ? `${8 + Math.max(level, 0.08) * 48 * Math.abs(Math.sin(i * 1.7))}px`
                        : status === "Speaking"
                          ? `${10 + 22 * Math.abs(Math.sin(i * 1.7))}px`
                          : "6px",
                  }}
                />
              ))}
            </div>
            <p className="voice-instruction">
              {status === "Listening"
                ? "Speak now. Pause when you’re done, or press Finish speaking."
                : status === "Transcribing"
                  ? "Turning your audio into text on this device…"
                  : status === "Speaking"
                    ? `${data.config.agent.name} is speaking. Your microphone is paused.`
                    : preparing
                      ? "Preparing on-device voice. You can keep typing while it loads."
                      : "Start voice to speak and hear replies. Or simply type in the conversation."}
            </p>
            <div className="voice-stage-controls">
              {voiceMode ? (
                <>
                  <button
                    className="button full"
                    disabled={busy || status === "Transcribing"}
                    onClick={toggleListening}
                  >
                    {status === "Listening" ? (
                      <>
                        <MicOff size={18} /> Finish speaking
                      </>
                    ) : ["Loading voice", "Connecting"].includes(status) ? (
                      <>
                        <Square size={16} /> Cancel voice
                      </>
                    ) : (
                      <>
                        <Mic size={18} /> Speak again
                      </>
                    )}
                  </button>
                  <button
                    className="button secondary full"
                    onClick={pauseVoice}
                  >
                    <MicOff size={16} /> Pause voice
                  </button>
                </>
              ) : (
                <button
                  className="button full"
                  disabled={busy}
                  onClick={startVoice}
                >
                  {preparing ? (
                    <LoaderCircle size={18} className="spin" />
                  ) : (
                    <Mic size={18} />
                  )}{" "}
                  Start voice conversation
                </button>
              )}
              {!active ? (
                <button
                  className="button secondary full"
                  disabled={busy}
                  onClick={beginText}
                >
                  <MessageSquare size={17} /> Start text conversation
                </button>
              ) : (
                <button
                  className="button secondary full"
                  disabled={busy}
                  onClick={end}
                >
                  <Square size={15} /> End conversation
                </button>
              )}
            </div>
            <div className="engine-setting">
              <Field label="Speech recognition">
                <select
                  aria-label="Speech recognition engine"
                  value={engine}
                  onChange={(e) => chooseEngine(e.target.value)}
                >
                  <option value="device">On-device voice · free</option>
                  <option value="browser">Browser recognition · online</option>
                </select>
              </Field>
              <p>
                {engine === "device"
                  ? "English speech runs on your device. First use downloads about 70 MB and can take 1–2 minutes. No API key or audio upload."
                  : speechSupported()
                    ? "Uses this browser’s recognition service. It may need an internet connection."
                    : "This browser does not expose speech recognition. Choose On-device voice."}
              </p>
            </div>
            {preparing && (
              <div className="model-progress" role="status">
                <Download size={17} />
                <div>
                  <strong>
                    Preparing voice model
                    {Number.isFinite(model.progress)
                      ? ` · ${Math.round(model.progress)}%`
                      : ""}
                  </strong>
                  <small>
                    {model.status === "progress"
                      ? "Downloading a voice component…"
                      : "Loading model and speech runtime…"}
                  </small>
                </div>
              </div>
            )}
            {model.state === "ready" && engine === "device" && (
              <span className="voice-ready">
                <Check size={15} /> On-device model ready
              </span>
            )}
            {voiceError && (
              <div className="voice-error" role="alert">
                <AlertCircle size={20} />
                <div>
                  <strong>Let’s get your voice working</strong>
                  <p>{voiceError}</p>
                  {engine === "browser" ? (
                    <button
                      className="text-link"
                      onClick={() => chooseEngine("device")}
                    >
                      Switch to on-device voice <ArrowUpRight size={15} />
                    </button>
                  ) : (
                    <button className="text-link" onClick={startVoice}>
                      <RefreshCw size={15} /> Retry voice
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
          <section className="panel booking-checklist">
            <h3>Before we book</h3>
            <p>Nothing is reserved until you confirm.</p>
            <ol>
              {steps.map(([label, done], i) => (
                <li key={label} className={done ? "complete" : ""}>
                  <span>{done ? <Check size={15} /> : i + 1}</span>
                  {label}
                  {done && <Check size={15} />}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
      <details className="panel agent-config">
        <summary>
          <span>
            <Settings2 size={20} />
            <strong>Receptionist settings</strong>
            <small>Name, greeting, and speaking preferences</small>
          </span>
          <span>Edit configuration</span>
        </summary>
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
                rows={4}
                maxLength={500}
                value={draft.greeting}
                onChange={(e) =>
                  setDraft({ ...draft, greeting: e.target.value })
                }
              />
            </Field>
            <div className="speech-setting">
              <Volume2 size={24} />
              <h3>Spoken replies for text chats</h3>
              <p>
                Voice conversations always start with audio enabled. This
                preference controls typed conversations.
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
            <span>Services and availability are configured in Settings.</span>
            <button className="button" disabled={saving}>
              {saving ? "Saving…" : "Save configuration"}
            </button>
          </div>
        </form>
      </details>
      <p className="data-note">
        Intent-based booking assistant · Browser calling, not a phone line · SMS
        confirmations are clearly labelled previews.
      </p>
    </>
  );
}
