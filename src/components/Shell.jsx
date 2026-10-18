import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  AudioLines,
  CalendarDays,
  Phone,
  Settings,
  ArrowUpRight,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "../state/AppContext";
import { Brand } from "./ui";
const navigation = [
  ["/app", "Overview", LayoutDashboard],
  ["/app/agent", "Voice Agent", AudioLines],
  ["/app/appointments", "Appointments", CalendarDays],
  ["/app/calls", "Call Logs", Phone],
  ["/app/settings", "Settings", Settings],
];
export default function Shell() {
  const { data, repository, error, setError, toast, active } = useApp(),
    [open, setOpen] = useState(false),
    location = useLocation();
  if (!data)
    return (
      <div className="boot">
        <Brand />
        <p>{error || "Preparing your workspace…"}</p>
        {error && (
          <button className="button" onClick={() => window.location.reload()}>
            Retry
          </button>
        )}
      </div>
    );
  return (
    <div className="app-shell">
      <button
        className="mobile-menu icon-button"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </button>
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <Link to="/" aria-label="Voicely home">
            <Brand />
          </Link>
          <button
            className="mobile-close icon-button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X />
          </button>
        </div>
        <Link
          className="business-switch"
          to="/app/settings"
          onClick={() => setOpen(false)}
        >
          <span className="business-avatar">
            {data.config.name.slice(0, 1)}
          </span>
          <span>
            <strong>{data.config.name}</strong>
            <small>
              {repository.mode === "demo"
                ? "Demo workspace"
                : "Cloud workspace"}
            </small>
          </span>
          <ChevronDown size={14} />
        </Link>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {navigation.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              end={path === "/app"}
              to={path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? "selected" : ""}`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === "Voice Agent" && active && (
                <i className="status-dot" />
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-card">
            <ShieldCheck size={19} />
            <strong>
              {repository.mode === "demo"
                ? "Your space to explore"
                : "Supabase connected"}
            </strong>
            <p>
              {repository.mode === "demo"
                ? "Try a conversation. Make a booking. Everything stays in this browser."
                : "Authenticated database storage with tenant isolation."}
            </p>
            <Link to="/app/agent">
              Meet your receptionist <ArrowUpRight size={15} />
            </Link>
          </div>
          <Link className="profile" to="/app/settings">
            <span className="profile-avatar">
              {repository.mode === "demo" ? "D" : "C"}
            </span>
            <span>
              <strong>
                {repository.mode === "demo"
                  ? "Demo account"
                  : "Business account"}
              </strong>
              <small>
                {repository.mode === "demo"
                  ? "No signup needed"
                  : "Cloud storage active"}
              </small>
            </span>
            <Settings size={17} />
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {navigation.find(([p]) => p === location.pathname)?.[1] ||
                "Overview"}
            </strong>
          </span>
          <div className="topbar-right">
            <span className="connection">
              <i />
              {repository.mode === "demo" ? "Local demo" : "Cloud connected"}
            </span>
            <Link to="/" className="site-link">
              Visit website <ArrowUpRight size={14} />
            </Link>
          </div>
        </header>
        {error && (
          <div className="notice error" role="alert">
            <span>{error}</span>
            <button
              className="icon-button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
        <main className="workspace-main">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Every conversation, taken care of.</span>
          <span>
            Voicely ·{" "}
            {repository.mode === "demo"
              ? "Demo data · SMS simulated"
              : "Cloud data · SMS simulated"}
          </span>
        </footer>
      </div>
    </div>
  );
}
