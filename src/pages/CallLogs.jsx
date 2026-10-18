import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Phone, ArrowUpRight, CalendarDays } from "lucide-react";
import { useApp } from "../state/AppContext";
import { PageTitle, Badge, Empty, Modal } from "../components/ui";
import { formatSlot } from "../domain/time";
export default function CallLogs() {
  const { data } = useApp(),
    [params, setParams] = useSearchParams(),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [order, setOrder] = useState("newest");
  const selected = data.conversations.find((x) => x.id === params.get("call"));
  const calls = data.conversations
    .filter(
      (c) =>
        (filter === "all" || c.outcome === filter) &&
        `${c.id} ${c.summary} ${c.messages.map((m) => m.text).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      order === "newest"
        ? b.startedAt.localeCompare(a.startedAt)
        : a.startedAt.localeCompare(b.startedAt),
    );
  return (
    <>
      <PageTitle
        eyebrow="EVERY HELLO HAS A STORY"
        title="The conversation continues."
        description="Actual transcripts, clear outcomes, and the details that matter."
      />
      <section className="panel">
        <div className="filter-bar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Search conversations"
              placeholder="Search transcripts or names…"
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
            <option value="booked">Booked</option>
            <option value="inquiry">Inquiry</option>
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
                <th>Conversation</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Outcome</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="table-person">
                      <span className="table-icon">
                        <Phone size={16} />
                      </span>
                      <div>
                        <strong>
                          {c.sample
                            ? "Sample conversation"
                            : `Conversation ${c.id.slice(0, 6)}`}
                        </strong>
                        <small>{c.summary}</small>
                      </div>
                    </div>
                  </td>
                  <td>{formatSlot(c.startedAt, data.config.timezone)}</td>
                  <td>
                    {c.endedAt
                      ? `${Math.max(0, Math.round((Date.parse(c.endedAt) - Date.parse(c.startedAt)) / 1000))}s`
                      : "In progress"}
                  </td>
                  <td>
                    <Badge
                      type={
                        c.outcome === "booked"
                          ? "green"
                          : c.outcome === "cancelled"
                            ? "red"
                            : "neutral"
                      }
                    >
                      {c.outcome}
                    </Badge>
                  </td>
                  <td>
                    <button
                      className="text-link"
                      aria-label={`Inspect conversation ${c.id.slice(0, 6)}`}
                      onClick={() => setParams({ call: c.id })}
                    >
                      Transcript <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!calls.length && (
            <Empty icon={Phone} title="No conversations found">
              Try another search, or start a conversation with your
              receptionist.
            </Empty>
          )}
        </div>
        <div className="panel-foot">
          {calls.length} saved conversation{calls.length !== 1 ? "s" : ""} ·
          Browser conversations, no phone calls
        </div>
      </section>
      {selected && (
        <Modal title="Conversation details" onClose={() => setParams({})}>
          <div className="call-detail">
            <div className="call-detail-meta">
              <Badge type={selected.outcome === "booked" ? "green" : "neutral"}>
                {selected.outcome}
              </Badge>
              <span>
                {formatSlot(selected.startedAt, data.config.timezone)} ·{" "}
                {selected.sample ? "Sample record" : "Actual interaction"}
              </span>
            </div>
            <p>{selected.summary}</p>
            {selected.appointmentIds.map((id) => {
              const a = data.appointments.find((a) => a.id === id);
              return a ? (
                <Link
                  to={`/app/appointments?booking=${id}`}
                  key={id}
                  className="linked-booking"
                >
                  <CalendarDays size={18} /> {a.customer} · {a.reference}{" "}
                  <Badge type={a.status === "confirmed" ? "green" : "red"}>
                    {a.status}
                  </Badge>
                  <ArrowUpRight size={15} />
                </Link>
              ) : null;
            })}
            <div className="saved-transcript">
              {selected.messages.map((m) => (
                <div key={m.id} className={`message ${m.role}`}>
                  <span className="message-avatar">
                    {m.role === "assistant" ? "V" : "Y"}
                  </span>
                  <div>
                    <div className="message-label">
                      {m.role === "assistant" ? "Receptionist" : "Customer"}
                      <time>{new Date(m.at).toLocaleTimeString()}</time>
                    </div>
                    <p>{m.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="data-note">
              {selected.messages.length} persisted messages ·{" "}
              {selected.endedAt
                ? "Conversation ended"
                : "Conversation in progress"}
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
