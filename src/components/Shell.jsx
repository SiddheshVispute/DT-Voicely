import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  AudioLines,
  UserCheck,
  CalendarDays,
  Phone,
  Settings,
  ArrowUpRight,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Building2,
  Plus,
  Check,
  User,
  Sparkles,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useApp } from "../state/AppContext";
import { Brand, Badge } from "./ui";
import ThemeToggle from "./ThemeToggle";

const navigation = [
  ["/app", "Overview", LayoutDashboard],
  ["/app/agent", "Voice Agent", AudioLines],
  ["/app/leads", "Leads", UserCheck],
  ["/app/appointments", "Appointments", CalendarDays],
  ["/app/calls", "Call Logs", Phone],
  ["/app/settings", "Settings", Settings],
];

export default function Shell() {
  const {
    data,
    repository,
    error,
    setError,
    toast,
    active,
    vapiActive,
    openLiveCall,
    switchBusiness,
    setUserRole,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [bizDropdown, setBizDropdown] = useState(false);
  const [roleDropdown, setRoleDropdown] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setBizDropdown(false);
        setRoleDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const businesses = data.businesses || [
    {
      id: data.config.id || "biz-1",
      name: data.config.name,
      category: data.config.category || "Professional Services",
    },
  ];

  const currentRole = data.currentUser?.role || "owner";

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

        {/* Business Switcher Dropdown */}
        <div className="business-switch-container" ref={dropdownRef}>
          <button
            className="business-switch"
            type="button"
            onClick={() => setBizDropdown(!bizDropdown)}
          >
            <span className="business-avatar">
              {data.config.name.slice(0, 1)}
            </span>
            <span>
              <strong>{data.config.name}</strong>
              <small>
                {repository.mode === "demo" ? "Demo workspace" : "Cloud workspace"} ·{" "}
                <span className="role-tag">{currentRole}</span>
              </small>
            </span>
            <ChevronDown size={14} />
          </button>

          {bizDropdown && (
            <div className="biz-dropdown-menu">
              <div className="biz-dropdown-header">WORKSPACES</div>
              {businesses.map((b) => (
                <button
                  key={b.id}
                  className={`biz-dropdown-item ${b.id === data.config.id ? "active" : ""}`}
                  onClick={() => {
                    switchBusiness(b.id);
                    setBizDropdown(false);
                    setOpen(false);
                  }}
                >
                  <Building2 size={15} />
                  <span>{b.name}</span>
                  {b.id === data.config.id && <Check size={14} className="check-icon" />}
                </button>
              ))}


            </div>
          )}
        </div>

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
              {label === "Voice Agent" && (active || vapiActive) && (
                <i className="status-dot pulse" />
              )}
              {label === "Leads" && (data.leads?.filter((l) => l.status === "new").length > 0) && (
                <span className="nav-badge">
                  {data.leads.filter((l) => l.status === "new").length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {/* Quick Voice Launch in Sidebar */}
          <button
            className="sidebar-voice-btn"
            onClick={() => {
              setOpen(false);
              openLiveCall();
            }}
          >
            <AudioLines size={18} />
            <span>Start Voice Call</span>
          </button>

          <div className="demo-card">
            <ShieldCheck size={19} />
            <strong>
              {repository.mode === "demo"
                ? "Your space to explore"
                : "Supabase connected"}
            </strong>
            <p>
              {repository.mode === "demo"
                ? "Try a Vapi conversation or book an appointment. Tenant data is isolated."
                : "Authenticated database storage with tenant isolation."}
            </p>
            <Link to="/app/agent">
              Meet your receptionist <ArrowUpRight size={15} />
            </Link>
          </div>

          {/* User Profile & Role Switcher */}
          <div className="profile-container">
            <button
              className="profile"
              type="button"
              onClick={() => setRoleDropdown(!roleDropdown)}
            >
              <span className="profile-avatar">
                {currentRole === "owner" ? "O" : currentRole === "admin" ? "A" : "E"}
              </span>
              <span>
                <strong>
                  {data.currentUser?.name || (repository.mode === "demo" ? "Demo User" : "Business Account")}
                </strong>
                <small>Role: {currentRole} (Click to switch)</small>
              </span>
              <ChevronDown size={14} />
            </button>

            {roleDropdown && (
              <div className="role-dropdown-menu">
                <div className="biz-dropdown-header">TESTING PERMISSIONS</div>
                <button
                  className={`biz-dropdown-item ${currentRole === "owner" ? "active" : ""}`}
                  onClick={() => {
                    setUserRole("owner");
                    setRoleDropdown(false);
                  }}
                >
                  <User size={14} />
                  <span>Owner (Full Access)</span>
                </button>
                <button
                  className={`biz-dropdown-item ${currentRole === "admin" ? "active" : ""}`}
                  onClick={() => {
                    setUserRole("admin");
                    setRoleDropdown(false);
                  }}
                >
                  <User size={14} />
                  <span>Admin</span>
                </button>
                <button
                  className={`biz-dropdown-item ${currentRole === "employee" ? "active" : ""}`}
                  onClick={() => {
                    setUserRole("employee");
                    setRoleDropdown(false);
                  }}
                >
                  <User size={14} />
                  <span>Employee (Restricted)</span>
                </button>
              </div>
            )}
          </div>
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
            <button
              className="button small topbar-voice-cta"
              onClick={openLiveCall}
            >
              <AudioLines size={15} /> Start a conversation
            </button>
            <span className="connection">
              <i />
              {repository.mode === "demo" ? "Local demo" : "Cloud connected"}
            </span>
            <ThemeToggle showLabel={false} />
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
            Voicely · {data.config.name} · {data.config.timezone} ·{" "}
            {repository.mode === "demo"
              ? "Demo data · SMS simulated"
              : "Cloud data · SMS simulated"}
          </span>
        </footer>
      </div>
    </div>
  );
}

