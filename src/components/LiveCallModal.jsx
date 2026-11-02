import { useEffect, useRef } from "react";
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
    conversation,
    active,
    status,
    level,
    end,
  } = useApp();

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [vapiTranscript, conversation?.messages]);

  if (!liveCallOpen) return null;

  const isVapi = liveCallMode === "vapi";
  const messages = isVapi ? vapiTranscript : (conversation?.messages || []);
  const currentStatus = isVapi ? vapiStatus : status;
  const currentVolume = isVapi ? vapiVolume : level;
  const isCallActive = isVapi ? vapiActive : active;

  return (
    <div className="live-call-backdrop" onClick={closeLiveCall}>
      <div className="live-call-modal" onClick={(e) => e.stopPropagation()}>
        <div className="live-call-header">
          <div className="live-call-title">
            <span className="live-call-icon">
              <AudioLines size={20} />
            </span>
            <div>
              <h3>Voice Call · {data.config.agent.name}</h3>
              <small>{data.config.name} Receptionist</small>
            </div>
          </div>
          <div className="live-call-header-right">
            <Badge
              type={
                currentStatus === "Connected" || currentStatus === "Listening" || currentStatus === "Speaking"
                  ? "green"
                  : currentStatus === "Demo Mode" || currentStatus === "Ready"
                  ? "neutral"
                  : "amber"
              }
            >
              <i className="status-dot" /> {currentStatus}
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

        {/* Demo Mode / Vapi Setup Notice */}
        {!isVapi && (
          <div className="live-call-notice">
            <Info size={16} />
            <span>
              <strong>Labelled Demo Mode:</strong> Vapi client key is not set. Using local offline speech & booking engine.{" "}
              <Link to="/app/settings" onClick={closeLiveCall} className="text-link">
                Configure Vapi in Settings →
              </Link>
            </span>
          </div>
        )}

        {vapiError && (
          <div className="notice error">
            <ShieldAlert size={16} />
            <span>{vapiError}</span>
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
            <AudioLines size={40} />
          </div>
          <div className="live-call-status-text">
            {currentStatus === "Speaking" ? (
              <span className="speaking-label">
                <Volume2 size={15} /> {data.config.agent.name} is speaking…
              </span>
            ) : currentStatus === "Listening" ? (
              <span className="listening-label">
                <Mic size={15} /> Listening to your microphone…
              </span>
            ) : isCallActive ? (
              <span>Call in progress… Speak naturally</span>
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
                {m.role === "assistant" ? data.config.agent.name : "You"}
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

        {/* Call Controls */}
        <div className="live-call-footer">
          {isCallActive ? (
            <button className="button danger live-end-button" onClick={endVapiCall}>
              <PhoneOff size={18} /> End Call
            </button>
          ) : (
            <button className="button secondary" onClick={closeLiveCall}>
              Close Window
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
