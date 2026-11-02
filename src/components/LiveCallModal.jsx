import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  PhoneOff,
  Mic,
  Volume2,
  X,
  Sparkles,
  Info,
  ExternalLink,
  ShieldAlert,
  Send,
  RotateCcw,
  Settings as SettingsIcon,
} from "lucide-react";
import { useApp } from "../state/AppContext";
import { Badge } from "./ui";
import { Link } from "react-router-dom";

export default function LiveCallModal() {
  const {
    data,
    liveCallOpen,
    liveCallMode,
    vapiStatus,
    vapiActive,
    vapiVolume,
    vapiTranscript,
    vapiError,
    endVapiCall,
    closeLiveCall,
    switchToInteractiveVoice,
    send,
    conversation,
    active,
    status,
    level,
    end,
  } = useApp();

  const [inputMessage, setInputMessage] = useState("");
  const scrollRef = useRef(null);

  const isVapi = liveCallMode === "vapi";
  const messages = isVapi ? vapiTranscript : (conversation?.messages || []);
  const currentStatus = isVapi ? vapiStatus : status;
  const currentVolume = isVapi ? vapiVolume : level;
  const isCallActive = isVapi ? vapiActive : Boolean(active);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [vapiTranscript, conversation?.messages]);

  if (!liveCallOpen) return null;

  function handleSend(e) {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    if (send) {
      send(inputMessage.trim());
      setInputMessage("");
    }
  }

  return (
    <div className="live-call-backdrop" onClick={closeLiveCall}>
      <div className="live-call-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="live-call-header">
          <div className="live-call-title">
            <span className={`live-call-icon ${isVapi ? "vapi-mode" : "demo-mode"}`}>
              {isVapi ? <AudioLines size={20} /> : <Sparkles size={20} />}
            </span>
            <div>
              <h3>Voice Call · {data.config.agent?.name || "Maya"}</h3>
              <small>
                {data.config.name} Receptionist ·{" "}
                <span className="mode-tag">{isVapi ? "Vapi Voice AI" : "Interactive Receptionist"}</span>
              </small>
            </div>
          </div>
          <div className="live-call-header-right">
            <Badge
              type={
                isCallActive
                  ? "green"
                  : currentStatus === "Error"
                  ? "amber"
                  : "neutral"
              }
            >
              <i className="status-dot" /> {currentStatus || (isCallActive ? "Connected" : "Ready")}
            </Badge>
            <button
              className="icon-button"
              aria-label="Close dialog"
              onClick={closeLiveCall}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Error Notice with 1-Click Fallback Action */}
        {vapiError && (
          <div className="live-call-error-box">
            <div className="error-box-top">
              <ShieldAlert size={18} className="error-icon" />
              <div className="error-box-text">
                <strong>Voice Connection Notice:</strong>
                <p>{vapiError}</p>
              </div>
            </div>
            <div className="error-box-actions">
              <button
                type="button"
                className="button primary small"
                onClick={switchToInteractiveVoice}
              >
                <Sparkles size={14} /> Switch to Built-in Interactive Voice
              </button>
              <Link
                to="/app/settings"
                onClick={closeLiveCall}
                className="button secondary small"
              >
                <SettingsIcon size={14} /> Vapi Settings
              </Link>
            </div>
          </div>
        )}

        {/* Informational badge when using Built-in Interactive Voice */}
        {!isVapi && !vapiError && (
          <div className="live-call-notice">
            <Info size={16} />
            <span>
              <strong>Interactive Voice Agent Active:</strong> Maya is listening and responding live.
              Appointments and leads are saved directly to your workspace.{" "}
              <Link to="/app/settings" onClick={closeLiveCall} className="text-link">
                Configure Vapi in Settings →
              </Link>
            </span>
          </div>
        )}

        {/* Visualizer Orb */}
        <div className="live-call-orb-container">
          <div
            className={`live-call-orb ${isCallActive ? "active" : ""}`}
            style={{
              transform: `scale(${1 + currentVolume * 0.4})`,
              boxShadow: `0 0 ${20 + currentVolume * 40}px rgba(98, 84, 232, ${0.4 + currentVolume * 0.5})`,
            }}
          >
            {isVapi ? <AudioLines size={40} /> : <Sparkles size={40} />}
          </div>
          <div className="live-call-status-text">
            {currentStatus === "Speaking" ? (
              <span className="speaking-label">
                <Volume2 size={15} /> {data.config.agent?.name || "Maya"} is speaking…
              </span>
            ) : currentStatus === "Listening" ? (
              <span className="listening-label">
                <Mic size={15} /> Listening to your microphone…
              </span>
            ) : isCallActive ? (
              <span>Call in progress… Speak naturally</span>
            ) : vapiError ? (
              <span className="error-subtext">Click below to start with Built-in Voice</span>
            ) : (
              <span>Call ended</span>
            )}
          </div>
        </div>

        {/* Live Conversation Transcript */}
        <div className="live-call-transcript" ref={scrollRef}>
          <div className="transcript-hint">
            <Sparkles size={13} /> Live conversation transcript
          </div>
          {messages.map((m) => (
            <div
              key={m.id || Math.random()}
              className={`live-message ${m.role === "assistant" ? "assistant" : "customer"}`}
            >
              <span className="message-speaker">
                {m.role === "assistant" ? (data.config.agent?.name || "Maya") : "You"}
              </span>
              <p>{m.text}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="empty-transcript">
              <p>Say hello or ask about services to begin the conversation…</p>
            </div>
          )}
        </div>

        {/* Quick Text Input for Hybrid Voice/Text Interaction */}
        {!isVapi && isCallActive && (
          <form onSubmit={handleSend} className="live-call-input-bar">
            <input
              type="text"
              placeholder="Or type your reply here..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
            />
            <button type="submit" className="button small primary" disabled={!inputMessage.trim()}>
              <Send size={14} /> Send
            </button>
          </form>
        )}

        {/* Call Controls */}
        <div className="live-call-footer">
          {isCallActive ? (
            <button
              className="button danger live-end-button"
              onClick={isVapi ? endVapiCall : end}
            >
              <PhoneOff size={18} /> End Call
            </button>
          ) : (
            <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
              <button
                type="button"
                className="button primary"
                style={{ flex: 1 }}
                onClick={switchToInteractiveVoice}
              >
                <Mic size={16} /> Start Interactive Voice Call
              </button>
              <button type="button" className="button secondary" onClick={closeLiveCall}>
                Close Window
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
