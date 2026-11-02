import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  Phone,
  ArrowUpRight,
  CalendarDays,
  UserCheck,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useApp } from "../state/AppContext";
import { PageTitle, Badge, Empty, Modal } from "../components/ui";
import { formatSlot, formatDate } from "../domain/time";

export default function CallLogs() {
  const { data } = useApp();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [order, setOrder] = useState("newest");

  const selected = (data.conversations || []).find((x) => x.id === params.get("call"));

  const calls = (data.conversations || [])
    .filter((c) => {
      const matchesFilter = filter === "all" || c.outcome === filter;
      const text = `${c.id} ${c.caller || ""} ${c.summary || ""} ${c.messages.map((m) => m.text).join(" ")}`.toLowerCase();
      const matchesQuery = text.includes(query.toLowerCase());
      return matchesFilter && matchesQuery;
    })
    .sort((a, b) =>
      order === "newest"
        ? b.startedAt.localeCompare(a.startedAt)
        : a.startedAt.localeCompare(b.startedAt),
    );

  const getOutcomeBadge = (outcome) => {
    switch (outcome) {
      case "booked":
        return <Badge type="green">Booked</Badge>;
      case "lead_created":
        return <Badge type="blue">Lead Created</Badge>;
      case "cancelled":
        return <Badge type="red">Cancelled</Badge>;
      default:
        return <Badge type="neutral">Inquiry</Badge>;
    }
  };

  const getSourceBadge = (source) => {
    switch (source) {
      case "vapi_voice":
        return <Badge type="purple">Vapi Voice</Badge>;
      case "website_widget":
        return <Badge type="blue">Widget</Badge>;
      case "demo_voice":
        return <Badge type="neutral">Demo Voice</Badge>;
      default:
        return <Badge type="neutral">Text</Badge>;
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="EVERY HELLO HAS A STORY"
        title="Call & conversation logs."
        description="Actual voice transcripts, summaries, outcomes, and resulting customer actions."
      />

      <section className="panel">
        <div className="filter-bar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Search conversations"
              placeholder="Search transcripts, caller names, or outcomes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            aria-label="Conversation outcome"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All outcomes</option>
            <option value="booked">Booked appointment</option>
            <option value="lead_created">Lead created</option>
            <option value="inquiry">General inquiry</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            aria-label="Sort conversations"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Caller / Conversation</th>
                <th>Channel</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Outcome</th>
                <th>Resulting Action</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => {
                const apptId = c.appointmentIds?.[0];
                const lead = (data.leads || []).find((l) => l.conversationId === c.id || l.id === c.leadId);

                return (
                  <tr key={c.id}>
                    <td>
                      <div className="table-person">
                        <span className="table-icon">
                          <Phone size={16} />
                        </span>
                        <div>
                          <strong>
                            {c.caller || (c.sample ? "Sample conversation" : `Conversation ${c.id.slice(0, 6)}`)}
                          </strong>
                          {c.sample && <small className="sample-tag">Sample</small>}
                          <small className="cell-sub">{c.summary}</small>
                        </div>
                      </div>
                    </td>
                    <td>{getSourceBadge(c.source)}</td>
                    <td>{formatSlot(c.startedAt, data.config.timezone)}</td>
                    <td>
                      {c.endedAt
                        ? `${Math.max(1, Math.round((Date.parse(c.endedAt) - Date.parse(c.startedAt)) / 1000))}s`
                        : c.durationSeconds
                        ? `${c.durationSeconds}s`
                        : "In progress"}
                    </td>
                    <td>{getOutcomeBadge(c.outcome)}</td>
                    <td>
                      {apptId ? (
                        <Link
                          to={`/app/appointments?booking=${apptId}`}
                          className="table-action-link"
                        >
                          <CalendarDays size={14} /> View Booking
                        </Link>
                      ) : lead ? (
                        <Link to="/app/leads" className="table-action-link lead-link">
                          <UserCheck size={14} /> View Lead ({lead.name})
                        </Link>
                      ) : (
                        <span className="text-muted">No action needed</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="text-link"
                        aria-label={`Transcript for conversation ${c.id.slice(0, 6)}`}
                        onClick={() => setParams({ call: c.id })}
                      >
                        Transcript <ArrowUpRight size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!calls.length && (
            <Empty icon={Phone} title="No conversations found">
              Try another search, or start a voice conversation with your receptionist.
            </Empty>
          )}
        </div>

        <div className="panel-foot">
          {calls.length} saved conversation{calls.length !== 1 ? "s" : ""} · Real stored transcripts with tenant isolation.
        </div>
      </section>

      {/* Transcript Detail Modal */}
      {selected && (
        <Modal title="Conversation transcript" onClose={() => setParams({})}>
          <div className="call-detail">
            <div className="call-detail-meta">
              <div className="meta-block">
                <span>Caller / Customer</span>
                <strong>{selected.caller || "Website Voice Caller"}</strong>
              </div>
              <div className="meta-block">
                <span>Channel</span>
                <div>{getSourceBadge(selected.source)}</div>
              </div>
              <div className="meta-block">
                <span>Outcome</span>
                <div>{getOutcomeBadge(selected.outcome)}</div>
              </div>
              <div className="meta-block">
                <span>Started</span>
                <strong>
                  {formatDate(selected.startedAt, data.config.timezone, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </div>
            </div>

            <div className="call-summary-box">
              <h4>Summary</h4>
              <p>{selected.summary}</p>
            </div>

            {/* Resulting Appointment or Lead */}
            {selected.appointmentIds?.length > 0 && (
              <div className="notice success">
                <CheckCircle size={16} />
                <span>
                  Resulted in confirmed booking:{" "}
                  <Link
                    to={`/app/appointments?booking=${selected.appointmentIds[0]}`}
                    onClick={() => setParams({})}
                    className="text-link"
                  >
                    View Appointment →
                  </Link>
                </span>
              </div>
            )}

            {selected.leadId && (
              <div className="notice success">
                <UserCheck size={16} />
                <span>
                  Saved as prospective lead:{" "}
                  <Link
                    to="/app/leads"
                    onClick={() => setParams({})}
                    className="text-link"
                  >
                    View Lead in Pipeline →
                  </Link>
                </span>
              </div>
            )}

            <div className="transcript-box">
              <h4>Actual Transcript ({selected.messages.length} messages)</h4>
              <div className="messages-stream">
                {selected.messages.map((m) => (
                  <div
                    key={m.id || Math.random()}
                    className={`transcript-msg ${m.role === "assistant" ? "assistant" : "customer"}`}
                  >
                    <span className="msg-author">
                      {m.role === "assistant" ? data.config.agent.name : selected.caller || "Customer"}
                    </span>
                    <p>{m.text}</p>
                    <small>{m.at ? formatSlot(m.at, data.config.timezone) : ""}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="button secondary" onClick={() => setParams({})}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
