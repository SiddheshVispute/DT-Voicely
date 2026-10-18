import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Phone,
  CalendarDays,
  Clock3,
  MessageSquare,
  AudioLines,
  Check,
  Sparkles,
} from "lucide-react";
import { useApp } from "../state/AppContext";
import { PageTitle, Badge, SectionHead } from "../components/ui";
import { formatSlot, formatDate, today, localParts } from "../domain/time";
export default function Overview() {
  const { data } = useApp(),
    c = data.config,
    upcoming = data.appointments
      .filter(
        (a) => a.status === "confirmed" && Date.parse(a.start) > Date.now(),
      )
      .sort((a, b) => a.start.localeCompare(b.start)),
    calls = data.conversations;
  const duration = calls.reduce(
    (n, x) =>
      n +
      (x.endedAt
        ? Math.max(0, Date.parse(x.endedAt) - Date.parse(x.startedAt))
        : 0),
    0,
  );
  const stats = [
    [Phone, calls.length, "Conversations", "Saved in your workspace"],
    [
      CalendarDays,
      data.appointments.filter((a) => a.status === "confirmed").length,
      "Confirmed bookings",
      "Including labelled sample data",
    ],
    [
      Clock3,
      `${Math.floor(duration / 60000)}m ${Math.floor(duration / 1000) % 60}s`,
      "Conversation time",
      "Completed conversations only",
    ],
    [
      MessageSquare,
      data.confirmations.length,
      "Confirmation previews",
      "Simulated · never sent",
    ],
  ];
  const recent = [...calls]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 4);
  return (
    <>
      <PageTitle
        eyebrow="YOUR RECEPTION, AT A GLANCE"
        title="A little more room in your day."
        description={`Here’s what’s happening at ${c.name}.`}
        action={
          <Link className="button" to="/app/agent">
            <AudioLines size={17} /> Start a conversation
          </Link>
        }
      />
      <div className="welcome-banner">
        <div>
          <span className="pill light-pill">
            <i /> READY WHEN YOU ARE
          </span>
          <h2>
            Your next conversation
            <br />
            could be a new appointment.
          </h2>
          <p>
            Meet {c.agent.name}. Ask a question, find a time, and see your
            calendar come to life.
          </p>
          <Link to="/app/agent" className="banner-link">
            Try your voice agent <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="banner-wave" aria-hidden="true">
          {[20, 38, 60, 33, 82, 100, 65, 42, 74, 50, 26, 45, 18].map((h, i) => (
            <i key={i} style={{ height: h }} />
          ))}
        </div>
        <span className="banner-stamp">
          <Sparkles size={16} /> CONVERSATIONS → ACTIONS
        </span>
      </div>
      <div className="stats-grid">
        {stats.map(([Icon, value, label, sub]) => (
          <div className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong data-testid={`metric-${label.split(" ")[0].toLowerCase()}`}>
              {value}
            </strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel">
          <SectionHead
            title="Coming up"
            subtitle="A little preparation goes a long way."
          >
            <Link to="/app/appointments" className="text-link">
              View calendar <ArrowUpRight size={15} />
            </Link>
          </SectionHead>
          <div className="upcoming-list">
            {upcoming.slice(0, 4).map((a) => (
              <Link
                to={`/app/appointments?booking=${a.id}`}
                className="upcoming-row"
                key={a.id}
              >
                <div className="date-block">
                  <strong>
                    {formatDate(a.start, c.timezone, {
                      day: "2-digit",
                      month: undefined,
                    })}
                  </strong>
                  <span>
                    {formatDate(a.start, c.timezone, {
                      day: undefined,
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="upcoming-name">
                  <strong>{a.customer}</strong>
                  <small>
                    {a.serviceName} {a.sample && "· Sample"}
                  </small>
                </div>
                <div className="upcoming-time">
                  <strong>
                    {formatDate(a.start, c.timezone, {
                      day: undefined,
                      month: undefined,
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </strong>
                  <small>
                    {(Date.parse(a.end) - Date.parse(a.start)) / 60000} minutes
                  </small>
                </div>
                <Badge type="green">Confirmed</Badge>
              </Link>
            ))}
            {!upcoming.length && (
              <div className="empty">
                <CalendarDays />
                <h3>A clear calendar</h3>
                <p>Your next confirmed booking will appear here.</p>
              </div>
            )}
          </div>
          <div className="panel-foot">
            <i className="status-dot" /> All times in {c.timezone}
          </div>
        </section>
        <section className="panel agent-summary">
          <SectionHead title="Your receptionist">
            <Link to="/app/agent" aria-label="Configure voice agent">
              <ArrowUpRight size={18} />
            </Link>
          </SectionHead>
          <div className="mini-orb">
            <AudioLines size={38} />
          </div>
          <h3>{c.agent.name}</h3>
          <p>{c.agent.tone}</p>
          <Badge type="green">
            <i /> Ready for a conversation
          </Badge>
          <div className="agent-detail">
            <span>Voice engine</span>
            <strong>Browser-native</strong>
            <span>Business knowledge</span>
            <strong>{c.services.length} services</strong>
          </div>
          <Link className="button secondary full" to="/app/agent">
            Open Voice Agent <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <section className="panel recent-panel">
        <SectionHead
          title="Recent conversations"
          subtitle="Every hello has a story."
        >
          <Link className="text-link" to="/app/calls">
            View all logs <ArrowUpRight size={15} />
          </Link>
        </SectionHead>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Conversation</th>
                <th>Started</th>
                <th>Messages</th>
                <th>Outcome</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recent.map((x, i) => (
                <tr key={x.id}>
                  <td>
                    <div className="table-person">
                      <span className="table-icon">
                        <Phone size={15} />
                      </span>
                      <span>
                        <strong>
                          {x.sample
                            ? "Sample conversation"
                            : `Conversation ${x.id.slice(0, 6)}`}
                        </strong>
                        <small>{x.summary}</small>
                      </span>
                    </div>
                  </td>
                  <td>{formatSlot(x.startedAt, c.timezone)}</td>
                  <td>{x.messages.length}</td>
                  <td>
                    <Badge
                      type={
                        x.outcome === "booked"
                          ? "green"
                          : x.outcome === "cancelled"
                            ? "red"
                            : "neutral"
                      }
                    >
                      {x.outcome}
                    </Badge>
                  </td>
                  <td>
                    <Link
                      to={`/app/calls?call=${x.id}`}
                      aria-label={`Open conversation ${x.id.slice(0, 6)}`}
                    >
                      <ArrowUpRight size={17} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="data-note">
        Metrics are calculated from stored records. Sample records are marked;
        no activity is generated in the background.
      </p>
    </>
  );
}
