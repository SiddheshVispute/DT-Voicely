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
  UserCheck,
  AlertCircle,
  Building2,
  Calendar,
} from "lucide-react";
import { useApp } from "../state/AppContext";
import { PageTitle, Badge, SectionHead } from "../components/ui";
import { formatSlot, formatDate, today } from "../domain/time";

export default function Overview() {
  const { data, openLiveCall } = useApp();
  const c = data.config;
  const calls = data.conversations || [];
  const leads = data.leads || [];
  const appointments = data.appointments || [];

  const upcoming = appointments
    .filter((a) => a.status === "confirmed" && Date.parse(a.start) > Date.now())
    .sort((a, b) => a.start.localeCompare(b.start));

  const newLeadsCount = leads.filter((l) => l.status === "new").length;
  const confirmedCount = appointments.filter((a) => a.status === "confirmed").length;

  // Unresolved enquiries: new leads + calls without an appointment or converted lead
  const unresolvedInquiries = leads.filter((l) => l.status === "new" || l.status === "contacted").length;

  const duration = calls.reduce(
    (n, x) =>
      n +
      (x.endedAt
        ? Math.max(0, Date.parse(x.endedAt) - Date.parse(x.startedAt))
        : (x.durationSeconds || 0) * 1000),
    0,
  );

  const stats = [
    [Phone, calls.length, "Total calls", "Saved in your workspace"],
    [UserCheck, newLeadsCount, "New leads", "Requiring follow-up"],
    [CalendarDays, confirmedCount, "Confirmed bookings", "Including labelled sample data"],
    [Clock3, upcoming.length, "Upcoming bookings", "Scheduled ahead"],
    [AlertCircle, unresolvedInquiries, "Unresolved enquiries", "Leads & pending calls"],
  ];

  // Combined recent customer activity
  const recentCalls = calls.slice(0, 3).map((c) => ({
    id: c.id,
    type: "call",
    title: c.caller || (c.sample ? "Sample Caller" : `Conversation ${c.id.slice(0, 6)}`),
    subtitle: c.summary,
    timestamp: c.startedAt,
    outcome: c.outcome,
    sample: c.sample,
    link: `/app/calls?call=${c.id}`,
  }));

  const recentBookings = upcoming.slice(0, 2).map((a) => ({
    id: a.id,
    type: "appointment",
    title: a.customer,
    subtitle: `${a.serviceName} · ${formatDate(a.start, c.timezone, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
    timestamp: a.createdAt,
    outcome: "confirmed",
    sample: a.sample,
    link: `/app/appointments?booking=${a.id}`,
  }));

  const recentLeads = leads.slice(0, 2).map((l) => ({
    id: l.id,
    type: "lead",
    title: l.name,
    subtitle: `${l.serviceRequested} · ${l.enquiry.slice(0, 60)}…`,
    timestamp: l.createdAt,
    outcome: l.status,
    sample: l.sample,
    link: `/app/leads`,
  }));

  const recentActivity = [...recentCalls, ...recentBookings, ...recentLeads]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 6);

  return (
    <>
      <PageTitle
        eyebrow="YOUR RECEPTION, AT A GLANCE"
        title="A little more room in your day."
        description={`Here’s what’s happening at ${c.name} (${c.category || "Professional Business"}).`}
        action={
          <button className="button" onClick={openLiveCall}>
            <AudioLines size={17} /> Start a conversation
          </button>
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
            Meet {c.agent.name}. Ask a question, find open times, and see your
            calendar and leads come to life in real-time.
          </p>
          <div className="banner-buttons">
            <button className="banner-voice-cta" onClick={openLiveCall}>
              <AudioLines size={18} /> Launch Voice Assistant
            </button>
            <Link to="/app/agent" className="banner-link">
              Configure agent <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <div className="banner-wave" aria-hidden="true">
          {[20, 38, 60, 33, 82, 100, 65, 42, 74, 50, 26, 45, 18].map((h, i) => (
            <i key={i} style={{ height: h }} />
          ))}
        </div>
        <span className="banner-stamp">
          <Sparkles size={16} /> CONVERSATIONS → LEADS & BOOKINGS
        </span>
      </div>

      {/* Overview 5-column metric cards */}
      <div className="stats-grid overview-stats-grid">
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
        {/* Coming Up Section */}
        <section className="panel">
          <SectionHead
            title="Upcoming appointments"
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

        {/* AI Receptionist Summary Panel */}
        <section className="panel agent-summary">
          <SectionHead title="AI Voice Receptionist">
            <Link to="/app/agent" aria-label="Configure voice agent">
              <ArrowUpRight size={18} />
            </Link>
          </SectionHead>
          <div className="mini-orb" onClick={openLiveCall} style={{ cursor: "pointer" }}>
            <AudioLines size={38} />
          </div>
          <h3>{c.agent.name}</h3>
          <p>{c.agent.tone}</p>
          <Badge type={c.vapi?.publicKey ? "green" : "neutral"}>
            <i /> {c.vapi?.publicKey ? "Vapi Voice Connected" : "Local Demo Voice Active"}
          </Badge>
          <div className="agent-detail">
            <span>Voice engine</span>
            <strong>{c.vapi?.publicKey ? "Vapi Web SDK" : "Browser-native (Demo)"}</strong>
            <span>Services known</span>
            <strong>{c.services.length} services</strong>
            <span>Active leads</span>
            <strong>{newLeadsCount} new</strong>
          </div>
          <button className="button primary full" onClick={openLiveCall}>
            <AudioLines size={16} /> Test Voice Conversation
          </button>
        </section>
      </div>

      {/* Recent Customer Activity */}
      <section className="panel recent-panel">
        <SectionHead
          title="Recent customer activity"
          subtitle="Real-time interactions across calls, leads, and bookings."
        >
          <Link className="text-link" to="/app/calls">
            View all logs <ArrowUpRight size={15} />
          </Link>
        </SectionHead>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Customer / Activity</th>
                <th>Type</th>
                <th>Details</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((x) => (
                <tr key={`${x.type}-${x.id}`}>
                  <td>
                    <div className="table-person">
                      <span className="table-icon">
                        {x.type === "call" ? (
                          <Phone size={15} />
                        ) : x.type === "appointment" ? (
                          <CalendarDays size={15} />
                        ) : (
                          <UserCheck size={15} />
                        )}
                      </span>
                      <span>
                        <strong>{x.title}</strong>
                        {x.sample && <small className="sample-tag">Sample</small>}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="activity-type-tag">
                      {x.type === "call" ? "Call" : x.type === "appointment" ? "Booking" : "Lead"}
                    </span>
                  </td>
                  <td>
                    <small>{x.subtitle}</small>
                  </td>
                  <td>
                    <Badge
                      type={
                        x.outcome === "booked" || x.outcome === "confirmed" || x.outcome === "converted"
                          ? "green"
                          : x.outcome === "new"
                          ? "blue"
                          : x.outcome === "cancelled"
                          ? "red"
                          : "neutral"
                      }
                    >
                      {x.outcome}
                    </Badge>
                  </td>
                  <td>
                    <Link to={x.link} aria-label={`Open ${x.title}`}>
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
        Metrics are calculated from stored records. Sample records are marked; no activity is generated in the background.
      </p>
    </>
  );
}
