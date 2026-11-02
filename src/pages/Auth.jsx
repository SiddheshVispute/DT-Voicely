import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles,
  PhoneCall,
  CalendarCheck2,
  Building2,
  Users,
  Clock,
  AudioLines,
  Calendar,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Headphones,
  Bot,
} from "lucide-react";
import { Brand } from "../components/ui";
import { useApp } from "../state/AppContext";
import ThemeToggle from "../components/ThemeToggle";

export default function Auth() {
  const navigate = useNavigate();
  const { data, switchBusiness } = useApp();

  // Split-screen hover active state: "left" | "right" | null
  const [activePanel, setActivePanel] = useState(null);

  // Auth toggle: "signin" | "register"
  const [mode, setMode] = useState("signin");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Registered / demo workspaces
  const workspaces = data?.businesses || [
    { id: "demo-biz-1", name: "Willow Wellness Spa & Clinic" },
  ];

  function handleSignIn(e) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both your work email and password.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid business email address.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/app");
    }, 600);
  }

  function handleDirectWorkspaceLogin(bizId) {
    if (switchBusiness) switchBusiness(bizId);
    navigate("/app");
  }

  return (
    <div className="auth-split-page">
      {/* Top Floating Header */}
      <header className="auth-header">
        <Link to="/" className="auth-brand" aria-label="Voicely Home">
          <Brand />
        </Link>
        <div className="auth-header-right">
          <ThemeToggle showLabel={false} />
          <Link to="/" className="auth-nav-link">
            Back to Home <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>

      {/* Split-Screen Hover Container */}
      <div
        className={`split-screen-container ${
          activePanel === "left"
            ? "expand-left"
            : activePanel === "right"
            ? "expand-right"
            : ""
        }`}
      >
        {/* ================= LEFT PANEL: HOW VOICELY WORKS ================= */}
        <section
          className={`split-panel split-panel-left ${
            activePanel === "left" ? "is-focused" : ""
          }`}
          onMouseEnter={() => setActivePanel("left")}
          onMouseLeave={() => setActivePanel(null)}
          onFocus={() => setActivePanel("left")}
          onBlur={() => setActivePanel(null)}
          tabIndex={0}
          aria-label="How Voicely Works"
        >
          <div className="panel-inner left-panel-content">
            <div className="panel-badge">
              <Sparkles size={14} />
              <span>THE 24/7 AI RECEPTIONIST</span>
            </div>

            <h1 className="split-headline">
              Your business. <br />
              <span className="gradient-text">Always available.</span>
            </h1>

            <p className="split-subtext">
              Never miss a client call again. Voicely answers inbound calls, answers service questions,
              qualifies enquiries, and books appointments straight into your calendar 24 hours a day.
            </p>

            {/* 3 Illustrated Steps */}
            <div className="how-it-works-steps">
              <div className="step-card">
                <div className="step-icon-box step-1">
                  <Building2 size={20} />
                  <span className="step-num">1</span>
                </div>
                <div className="step-text">
                  <h3>Connect & Configure</h3>
                  <p>
                    Connect your business, configure your services, operating hours, and voice assistant tone.
                  </p>
                </div>
              </div>

              <div className="step-card">
                <div className="step-icon-box step-2">
                  <PhoneCall size={20} />
                  <span className="step-num">2</span>
                </div>
                <div className="step-text">
                  <h3>Customers Call Naturally</h3>
                  <p>
                    Callers speak naturally with your custom AI assistant just like a human front-desk receptionist.
                  </p>
                </div>
              </div>

              <div className="step-card">
                <div className="step-icon-box step-3">
                  <CalendarCheck2 size={20} />
                  <span className="step-num">3</span>
                </div>
                <div className="step-text">
                  <h3>Leads & Appointments Appear</h3>
                  <p>
                    Confirmed slots book automatically in real-time, non-booking callers become leads, and transcripts log instantly.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Highlights Pills */}
            <div className="split-highlights">
              <span className="highlight-pill">
                <Clock size={13} /> 24/7 AI Receptionist
              </span>
              <span className="highlight-pill">
                <CalendarCheck2 size={13} /> Automated Booking
              </span>
              <span className="highlight-pill">
                <Users size={13} /> Lead Management
              </span>
              <span className="highlight-pill">
                <AudioLines size={13} /> Call History & Audio
              </span>
              <span className="highlight-pill">
                <Calendar size={13} /> Calendar Integration
              </span>
            </div>

            {/* Subtle Interactive Hint */}
            <div className="panel-footer-hint">
              <span>Ready to start? Select an option on the right</span>
              <ArrowRight size={15} />
            </div>
          </div>
        </section>

        {/* Center Split Divider / Floating Emblem */}
        <div className="split-divider">
          <div className="split-divider-line" />
          <div className="split-divider-badge" title="Voicely Business Hub">
            <ShieldCheck size={18} />
          </div>
        </div>

        {/* ================= RIGHT PANEL: BUSINESS ACCESS ================= */}
        <section
          className={`split-panel split-panel-right ${
            activePanel === "right" ? "is-focused" : ""
          }`}
          onMouseEnter={() => setActivePanel("right")}
          onMouseLeave={() => setActivePanel(null)}
          onFocus={() => setActivePanel("right")}
          onBlur={() => setActivePanel(null)}
          tabIndex={0}
          aria-label="Business Access"
        >
          <div className="panel-inner right-panel-content">
            <div className="auth-card">
              {/* Option Selector Toggle */}
              <div className="auth-toggle-pill">
                <button
                  type="button"
                  className={`toggle-option ${mode === "signin" ? "active" : ""}`}
                  onClick={() => {
                    setMode("signin");
                    setError("");
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`toggle-option ${mode === "register" ? "active" : ""}`}
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                >
                  Create Business Account
                </button>
              </div>

              {/* Mode 1: Sign In for existing business owners */}
              {mode === "signin" && (
                <div className="auth-mode-content">
                  <div className="auth-form-head">
                    <h2>Sign In to Workspace</h2>
                    <p>Enter your business credentials to manage calls and appointments.</p>
                  </div>

                  {error && (
                    <div className="auth-error-banner" role="alert">
                      {error}
                    </div>
                  )}

                  {forgotSent && (
                    <div className="auth-success-banner">
                      Password reset instructions have been sent to {email || "your email"}.
                    </div>
                  )}

                  <form onSubmit={handleSignIn} className="auth-form">
                    <div className="auth-field">
                      <label htmlFor="auth-email">Work Email</label>
                      <div className="auth-input-wrapper">
                        <Mail size={16} className="input-icon" />
                        <input
                          id="auth-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="owner@yourbusiness.com"
                          required
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div className="auth-field">
                      <div className="auth-label-row">
                        <label htmlFor="auth-password">Password</label>
                        <button
                          type="button"
                          className="forgot-link"
                          onClick={() => setForgotSent(true)}
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="auth-input-wrapper">
                        <Lock size={16} className="input-icon" />
                        <input
                          id="auth-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          className="pwd-toggle-btn"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="auth-remember-row">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span>Remember this device</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="button primary auth-submit-btn"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign in to Dashboard"}
                      {!loading && <ArrowRight size={16} />}
                    </button>
                  </form>

                  {/* Fast workspace switcher bypass for existing owners */}
                  <div className="quick-access-section">
                    <span className="quick-access-label">
                      Or jump straight to your demo workspace:
                    </span>
                    <div className="workspace-chips">
                      {workspaces.map((biz) => (
                        <button
                          key={biz.id}
                          type="button"
                          className="workspace-chip-btn"
                          onClick={() => handleDirectWorkspaceLogin(biz.id)}
                        >
                          <Building2 size={14} />
                          <span>{biz.name}</span>
                          <ArrowRight size={13} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode 2: Create Business Account (Triggers 5-Step Onboarding Wizard) */}
              {mode === "register" && (
                <div className="auth-mode-content">
                  <div className="auth-form-head">
                    <h2>Create Business Account</h2>
                    <p>
                      Set up your 24/7 AI receptionist and connect your business phone in 5 minutes.
                    </p>
                  </div>

                  <div className="register-benefits-list">
                    <div className="benefit-item">
                      <CheckCircle2 size={18} className="benefit-check" />
                      <div>
                        <strong>5-Step Guided Onboarding</strong>
                        <p>Account creation, business profile, services & availability, integrations, and review.</p>
                      </div>
                    </div>
                    <div className="benefit-item">
                      <CheckCircle2 size={18} className="benefit-check" />
                      <div>
                        <strong>Vapi Voice AI & Phone Routing</strong>
                        <p>Real-time inbound phone call routing with live appointment bookings.</p>
                      </div>
                    </div>
                    <div className="benefit-item">
                      <CheckCircle2 size={18} className="benefit-check" />
                      <div>
                        <strong>Google Calendar & Isolated Data</strong>
                        <p>Two-way calendar sync, separate customer leads, and call transcripts.</p>
                      </div>
                    </div>
                  </div>

                  <div className="auth-register-action">
                    <button
                      type="button"
                      className="button primary auth-submit-btn"
                      onClick={() => navigate("/onboarding")}
                    >
                      <span>Start 5-Step Business Onboarding</span>
                      <ArrowRight size={17} />
                    </button>
                    <p className="auth-switch-note">
                      Already registered?{" "}
                      <button
                        type="button"
                        className="text-link-btn"
                        onClick={() => setMode("signin")}
                      >
                        Sign in to existing workspace
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
