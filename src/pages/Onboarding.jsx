import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Building2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Clock,
  Calendar,
  AudioLines,
  Key,
  ShieldCheck,
  HelpCircle,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Globe,
  MapPin,
  Phone,
  CalendarDays,
  CalendarCheck2,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { useApp } from "../state/AppContext";
import { Brand, Field, Badge } from "../components/ui";
import ThemeToggle from "../components/ThemeToggle";

const CATEGORIES = [
  "Spa & Wellness",
  "Salon & Beauty",
  "Gym & Fitness",
  "Clinic & Healthcare",
  "Dental Practice",
  "Consulting & Legal",
  "Home Services & Trades",
  "Automotive Services",
  "Financial & Accounting",
  "Other Professional Services",
];

const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

const COUNTRIES = [
  "United States",
  "India",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "United Arab Emirates",
  "Singapore",
  "Other",
];

export default function Onboarding() {
  const { createBusiness } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(false);

  // STEP 1 - Account Creation State
  const [account, setAccount] = useState({
    ownerName: "",
    workEmail: "",
    password: "",
    confirmPassword: "",
    showPassword: false,
    verificationNotice: true,
  });

  // STEP 2 - Business Profile State
  const [profile, setProfile] = useState({
    name: "",
    category: "Spa & Wellness",
    phone: "+1 (555) 234-5678",
    email: "",
    website: "https://mybusiness.com",
    address: "742 Evergreen Terrace, Suite 100",
    country: "United States",
    timezone: "America/New_York",
  });

  // STEP 3 - Services and Availability State
  const [services, setServices] = useState([
    {
      id: "srv-consultation",
      name: "Initial Consultation",
      duration: 30,
      price: 50,
      description: "Comprehensive initial intake and evaluation with our specialist.",
    },
    {
      id: "srv-standard",
      name: "Standard Wellness Session",
      duration: 60,
      price: 120,
      description: "Full service dedicated appointment with customized treatment.",
    },
  ]);

  const [hours, setHours] = useState(
    Object.fromEntries(
      [0, 1, 2, 3, 4, 5, 6].map((day) => [
        day,
        { open: day !== 0, start: "09:00", end: "18:00" },
      ])
    )
  );

  const [bookingRules, setBookingRules] = useState({
    buffer: 10,
    advanceDays: 30,
    minNotice: 2,
    breakSummary: "13:00 - 14:00 (Daily lunch break)",
  });

  // STEP 4 - Integrations State
  const [integrations, setIntegrations] = useState({
    googleCalendar: {
      connected: false,
      email: "",
      selectedCalendar: "Primary Appointments Calendar",
    },
    vapi: {
      publicKey: "",
      assistantId: "",
      phoneNumber: "",
      serverSecret: "",
      inboundRouting: "direct_assistant",
      connected: false,
    },
  });

  const daysList = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  // Helper updates
  const updateAccount = (field, val) =>
    setAccount((prev) => ({ ...prev, [field]: val }));
  const updateProfile = (field, val) =>
    setProfile((prev) => ({ ...prev, [field]: val }));

  // Service helpers
  function addService() {
    const id = `srv-${Date.now().toString().slice(-5)}`;
    setServices((prev) => [
      ...prev,
      {
        id,
        name: "New Service",
        duration: 45,
        price: 80,
        description: "Service description for the AI receptionist to explain.",
      },
    ]);
  }

  function removeService(index) {
    if (services.length <= 1) return;
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  function updateService(index, field, value) {
    setServices((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  // Hours helpers
  function toggleDay(day) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], open: !prev[day].open },
    }));
  }

  function updateDayHours(day, field, val) {
    setHours((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: val },
    }));
  }

  // Google Calendar OAuth simulate
  function handleConnectGoogle() {
    const emailToUse = account.workEmail || profile.email || "owner@business.com";
    setIntegrations((prev) => ({
      ...prev,
      googleCalendar: {
        connected: !prev.googleCalendar.connected,
        email: !prev.googleCalendar.connected ? emailToUse : "",
        selectedCalendar: "Primary Appointments Calendar",
      },
    }));
  }

  // Vapi update helper
  function updateVapi(field, val) {
    setIntegrations((prev) => ({
      ...prev,
      vapi: {
        ...prev.vapi,
        [field]: val,
        connected: Boolean(
          field === "assistantId" ? val : prev.vapi.assistantId
        ),
      },
    }));
  }

  // Step 1 Validation
  function handleStep1Submit(e) {
    e.preventDefault();
    setError("");

    if (!account.ownerName.trim()) {
      setError("Please enter the business owner's full name.");
      return;
    }
    if (!account.workEmail.trim() || !account.workEmail.includes("@")) {
      setError("Please enter a valid business work email.");
      return;
    }
    if (account.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (account.password !== account.confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    if (!profile.email) {
      setProfile((prev) => ({ ...prev, email: account.workEmail }));
    }

    setStep(2);
  }

  // Step 2 Validation
  function handleStep2Submit(e) {
    e.preventDefault();
    setError("");

    if (!profile.name.trim()) {
      setError("Please enter your business name.");
      return;
    }
    if (!profile.phone.trim()) {
      setError("Please enter a contact phone number.");
      return;
    }

    setStep(3);
  }

  // Step 3 Validation
  function handleStep3Submit(e) {
    e.preventDefault();
    setError("");

    if (services.length === 0 || !services.some((s) => s.name.trim())) {
      setError("Please configure at least one active service.");
      return;
    }

    setStep(4);
  }

  // Complete Onboarding & Launch Workspace
  async function handleCompleteSetup() {
    setBusy(true);
    setError("");

    try {
      const newBusinessPayload = {
        name: profile.name,
        category: profile.category,
        phone: profile.phone,
        email: profile.email || account.workEmail,
        website: profile.website,
        address: profile.address,
        country: profile.country,
        timezone: profile.timezone,
        owner: {
          name: account.ownerName,
          email: account.workEmail,
        },
        services: services.map((s) => ({
          ...s,
          duration: Number(s.duration) || 30,
          price: Number(s.price) || 0,
        })),
        hours,
        buffer: Number(bookingRules.buffer) || 10,
        advanceDays: Number(bookingRules.advanceDays) || 30,
        minNotice: Number(bookingRules.minNotice) || 2,
        vapi: {
          publicKey: integrations.vapi.publicKey,
          assistantId: integrations.vapi.assistantId,
          phoneNumber: integrations.vapi.phoneNumber || profile.phone,
          serverSecret: integrations.vapi.serverSecret,
          inboundRouting: integrations.vapi.inboundRouting,
          enabled: Boolean(integrations.vapi.assistantId),
        },
        googleCalendar: {
          connected: integrations.googleCalendar.connected,
          email: integrations.googleCalendar.email,
          selectedCalendar: integrations.googleCalendar.selectedCalendar,
        },
        agent: {
          name: "Maya",
          tone: "Warm and professional",
          greeting: `Hello! Welcome to ${profile.name || "our business"}. I'm Maya, your AI receptionist. How can I help you today?`,
          prompt: "Be courteous, helpful, and concise. Verify availability and confirm appointment details.",
          faqs: [
            {
              id: "faq-1",
              question: "Where are you located and is parking available?",
              answer: `We are located at ${profile.address || "our main facility"}. Dedicated customer parking is available.`,
            },
          ],
        },
      };

      await createBusiness(newBusinessPayload);
      navigate("/app");
    } catch (err) {
      setError(err?.message || "Failed to create business workspace.");
      setBusy(false);
    }
  }

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/vapi/webhook`
    : "https://yourdomain.com/api/vapi/webhook";

  const stepTitles = [
    "Account Creation",
    "Business Profile",
    "Services & Availability",
    "Integrations",
    "Review & Launch",
  ];

  return (
    <div className="onboarding-page">
      {/* Top Floating Header */}
      <header className="onboarding-header">
        <Link to="/" aria-label="Voicely Home">
          <Brand />
        </Link>

        {/* 5-Step Progress Indicator */}
        <div className="onboarding-progress-center">
          <div className="step-counter-text">
            <span>Step {step} of 5:</span>
            <strong>{stepTitles[step - 1]}</strong>
          </div>
          <div className="step-progress-track">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`step-segment ${
                  s < step ? "is-complete" : s === step ? "is-current" : ""
                }`}
                title={`Step ${s}: ${stepTitles[s - 1]}`}
              >
                <div className="segment-bar" />
                <span className="segment-dot">
                  {s < step ? <Check size={12} /> : s}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="onboarding-header-actions">
          <ThemeToggle showLabel={false} />
          <Link to="/app" className="skip-link">
            Skip to demo <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="onboarding-container">
        {error && (
          <div className="onboarding-error-banner" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        {/* ================= STEP 1: ACCOUNT CREATION ================= */}
        {step === 1 && (
          <div className="onboarding-card fade-in">
            <div className="step-badge">
              <User size={14} />
              <span>STEP 1 OF 5 · OWNER ACCOUNT</span>
            </div>
            <h2>Create your business owner account.</h2>
            <p>
              You will use these credentials to manage your business workspaces, view live call transcripts,
              and manage team permissions.
            </p>

            <form onSubmit={handleStep1Submit} className="onboarding-form">
              <Field
                label="Owner's Full Name"
                hint="Your legal name as the workspace owner and administrator"
              >
                <div className="auth-input-wrapper">
                  <User size={16} className="input-icon" />
                  <input
                    type="text"
                    value={account.ownerName}
                    onChange={(e) => updateAccount("ownerName", e.target.value)}
                    placeholder="e.g. Dr. Sarah Jenkins"
                    required
                    autoFocus
                  />
                </div>
              </Field>

              <Field
                label="Work Email"
                hint="We will send your business workspace credentials and call summaries here"
              >
                <div className="auth-input-wrapper">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    value={account.workEmail}
                    onChange={(e) => updateAccount("workEmail", e.target.value)}
                    placeholder="sarah@willowwellness.com"
                    required
                  />
                </div>
              </Field>

              <div className="field-row">
                <Field label="Password" hint="At least 6 characters">
                  <div className="auth-input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type={account.showPassword ? "text" : "password"}
                      value={account.password}
                      onChange={(e) => updateAccount("password", e.target.value)}
                      placeholder="Create a strong password"
                      required
                    />
                    <button
                      type="button"
                      className="pwd-toggle-btn"
                      onClick={() =>
                        updateAccount("showPassword", !account.showPassword)
                      }
                      aria-label="Toggle password visibility"
                    >
                      {account.showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirm Password">
                  <div className="auth-input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      type={account.showPassword ? "text" : "password"}
                      value={account.confirmPassword}
                      onChange={(e) =>
                        updateAccount("confirmPassword", e.target.value)
                      }
                      placeholder="Confirm password"
                      required
                    />
                  </div>
                </Field>
              </div>

              {/* Email Verification Info Card */}
              <div className="verification-info-box">
                <ShieldCheck size={18} className="shield-icon" />
                <div>
                  <strong>Email Verification Configured</strong>
                  <p>
                    A secure authentication confirmation link will be issued to your work email.
                    You can start configuring your AI assistant immediately.
                  </p>
                </div>
              </div>

              <div className="onboarding-actions">
                <Link to="/auth" className="button secondary">
                  <ArrowLeft size={16} /> Back to Sign In
                </Link>
                <button type="submit" className="button primary">
                  Continue to Business Profile <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= STEP 2: BUSINESS PROFILE ================= */}
        {step === 2 && (
          <div className="onboarding-card fade-in">
            <div className="step-badge">
              <Building2 size={14} />
              <span>STEP 2 OF 5 · BUSINESS PROFILE</span>
            </div>
            <h2>Tell us about your establishment.</h2>
            <p>
              Your AI receptionist Maya uses this profile to introduce your company, answer location questions,
              and correctly format customer appointment times.
            </p>

            <form onSubmit={handleStep2Submit} className="onboarding-form">
              <Field
                label="Business Name"
                hint="The official establishment name your callers will hear"
              >
                <div className="auth-input-wrapper">
                  <Building2 size={16} className="input-icon" />
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => updateProfile("name", e.target.value)}
                    placeholder="e.g. Willow Wellness Spa & Clinic"
                    required
                    autoFocus
                  />
                </div>
              </Field>

              <div className="field-row">
                <Field label="Business Category">
                  <select
                    value={profile.category}
                    onChange={(e) => updateProfile("category", e.target.value)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Contact Phone Number" hint="Customer enquiry number">
                  <div className="auth-input-wrapper">
                    <Phone size={16} className="input-icon" />
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => updateProfile("phone", e.target.value)}
                      placeholder="+1 (555) 234-5678"
                      required
                    />
                  </div>
                </Field>
              </div>

              <div className="field-row">
                <Field label="Public Contact Email">
                  <div className="auth-input-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => updateProfile("email", e.target.value)}
                      placeholder="contact@willowwellness.com"
                      required
                    />
                  </div>
                </Field>

                <Field label="Website URL">
                  <div className="auth-input-wrapper">
                    <Globe size={16} className="input-icon" />
                    <input
                      type="url"
                      value={profile.website}
                      onChange={(e) => updateProfile("website", e.target.value)}
                      placeholder="https://willowwellness.com"
                    />
                  </div>
                </Field>
              </div>

              <Field
                label="Physical Business Address"
                hint="Used when callers ask for directions, parking, or location"
              >
                <div className="auth-input-wrapper">
                  <MapPin size={16} className="input-icon" />
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => updateProfile("address", e.target.value)}
                    placeholder="e.g. 742 Evergreen Terrace, Suite 100, Springfield"
                    required
                  />
                </div>
              </Field>

              <div className="field-row">
                <Field label="Country">
                  <select
                    value={profile.country}
                    onChange={(e) => updateProfile("country", e.target.value)}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Operating Time Zone">
                  <select
                    value={profile.timezone}
                    onChange={(e) => updateProfile("timezone", e.target.value)}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="onboarding-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" className="button primary">
                  Continue to Services & Availability <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= STEP 3: SERVICES AND AVAILABILITY ================= */}
        {step === 3 && (
          <div className="onboarding-card fade-in">
            <div className="step-badge">
              <CalendarDays size={14} />
              <span>STEP 3 OF 5 · SERVICES & AVAILABILITY</span>
            </div>
            <h2>Configure services and weekly opening hours.</h2>
            <p>
              Your AI receptionist checks real-time availability against these operating hours and booking rules
              before confirming any appointment.
            </p>

            <form onSubmit={handleStep3Submit} className="onboarding-form">
              {/* Services Sub-Section */}
              <div className="services-section-head">
                <div>
                  <h3>Offered Services & Pricing</h3>
                  <p>Add the services that callers can inquire about or book.</p>
                </div>
                <button
                  type="button"
                  className="button secondary small"
                  onClick={addService}
                >
                  <Plus size={15} /> Add Service
                </button>
              </div>

              <div className="services-setup-list">
                {services.map((service, index) => (
                  <div key={service.id || index} className="service-card-item">
                    <div className="service-card-header">
                      <span className="service-index-badge">#{index + 1}</span>
                      <Field label="Service Name">
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) =>
                            updateService(index, "name", e.target.value)
                          }
                          placeholder="e.g. Initial Consultation"
                          required
                        />
                      </Field>
                      {services.length > 1 && (
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() => removeService(index)}
                          title="Remove service"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="field-row">
                      <Field label="Duration (minutes)">
                        <input
                          type="number"
                          min="5"
                          max="480"
                          step="5"
                          value={service.duration}
                          onChange={(e) =>
                            updateService(
                              index,
                              "duration",
                              parseInt(e.target.value) || 30
                            )
                          }
                          required
                        />
                      </Field>
                      <Field label="Price ($ / ₹)">
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={service.price}
                          onChange={(e) =>
                            updateService(
                              index,
                              "price",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          required
                        />
                      </Field>
                    </div>

                    <Field label="Short Description (for AI speech explanations)">
                      <input
                        type="text"
                        value={service.description}
                        onChange={(e) =>
                          updateService(index, "description", e.target.value)
                        }
                        placeholder="Explain what the service covers..."
                      />
                    </Field>
                  </div>
                ))}
              </div>

              {/* Weekly Opening Hours Sub-Section */}
              <div className="hours-section-head">
                <h3>Weekly Operating Hours & Closed Days</h3>
                <p>Toggle which days your business accepts appointments.</p>
              </div>

              <div className="hours-grid">
                {daysList.map((dayName, idx) => {
                  const dayHour = hours[idx];
                  return (
                    <div
                      key={idx}
                      className={`hour-row ${
                        dayHour.open ? "is-open" : "is-closed"
                      }`}
                    >
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={dayHour.open}
                          onChange={() => toggleDay(idx)}
                        />
                        <strong>{dayName}</strong>
                      </label>

                      {dayHour.open ? (
                        <div className="time-range-inputs">
                          <input
                            type="time"
                            value={dayHour.start}
                            onChange={(e) =>
                              updateDayHours(idx, "start", e.target.value)
                            }
                          />
                          <span>to</span>
                          <input
                            type="time"
                            value={dayHour.end}
                            onChange={(e) =>
                              updateDayHours(idx, "end", e.target.value)
                            }
                          />
                        </div>
                      ) : (
                        <span className="closed-tag">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Appointment Buffer and Booking Rules */}
              <div className="booking-rules-head">
                <h3>Appointment Buffers & Booking Rules</h3>
                <p>Prevent back-to-back overlaps and define scheduling boundaries.</p>
              </div>

              <div className="field-row">
                <Field
                  label="Buffer Between Bookings (minutes)"
                  hint="Recovery time added after each appointment"
                >
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={bookingRules.buffer}
                    onChange={(e) =>
                      setBookingRules((prev) => ({
                        ...prev,
                        buffer: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </Field>

                <Field
                  label="Advance Booking Limit (days)"
                  hint="How far into the future customers can schedule"
                >
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={bookingRules.advanceDays}
                    onChange={(e) =>
                      setBookingRules((prev) => ({
                        ...prev,
                        advanceDays: parseInt(e.target.value) || 30,
                      }))
                    }
                  />
                </Field>
              </div>

              <div className="onboarding-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" className="button primary">
                  Continue to Integrations <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= STEP 4: INTEGRATIONS ================= */}
        {step === 4 && (
          <div className="onboarding-card fade-in">
            <div className="step-badge">
              <Sparkles size={14} />
              <span>STEP 4 OF 5 · INTEGRATIONS</span>
            </div>
            <h2>Connect your calendar & voice provider.</h2>
            <p>
              You can connect Google Calendar and Vapi Voice AI now, or skip and configure them anytime in Settings.
            </p>

            <div className="integrations-list">
              {/* Google Calendar Connection Card */}
              <div className="integration-card">
                <div className="integration-card-head">
                  <div className="integration-icon-title">
                    <div className="integration-icon-wrap gcal-icon">
                      <Calendar size={22} />
                    </div>
                    <div>
                      <strong>Google Calendar</strong>
                      <p>Two-way sync for checking slot conflicts and saving bookings</p>
                    </div>
                  </div>
                  <Badge
                    type={
                      integrations.googleCalendar.connected
                        ? "green"
                        : "neutral"
                    }
                  >
                    {integrations.googleCalendar.connected
                      ? "Connected"
                      : "Not Connected"}
                  </Badge>
                </div>

                <div className="integration-card-body">
                  <p>
                    {integrations.googleCalendar.connected
                      ? `Connected to ${integrations.googleCalendar.email}. Calendar appointments will automatically cross-check with Voicely.`
                      : "Authorize Google Calendar through OAuth to prevent double booking with your personal or team calendar."}
                  </p>

                  {integrations.googleCalendar.connected && (
                    <Field label="Calendar Used for Appointments">
                      <select
                        value={integrations.googleCalendar.selectedCalendar}
                        onChange={(e) =>
                          setIntegrations((prev) => ({
                            ...prev,
                            googleCalendar: {
                              ...prev.googleCalendar,
                              selectedCalendar: e.target.value,
                            },
                          }))
                        }
                      >
                        <option value="Primary Appointments Calendar">
                          Primary Appointments Calendar
                        </option>
                        <option value="Voicely Dedicated Bookings">
                          Voicely Dedicated Bookings
                        </option>
                        <option value="Staff Schedule">Staff Schedule</option>
                      </select>
                    </Field>
                  )}

                  <div className="integration-btn-row">
                    <button
                      type="button"
                      className={`button small ${
                        integrations.googleCalendar.connected
                          ? "secondary"
                          : "primary"
                      }`}
                      onClick={handleConnectGoogle}
                    >
                      {integrations.googleCalendar.connected ? (
                        "Disconnect Google Calendar"
                      ) : (
                        <>
                          <CalendarCheck2 size={15} /> Connect Google Calendar via OAuth
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Vapi Voice AI Connection Card */}
              <div className="integration-card">
                <div className="integration-card-head">
                  <div className="integration-icon-title">
                    <div className="integration-icon-wrap vapi-icon">
                      <AudioLines size={22} />
                    </div>
                    <div>
                      <strong>Vapi Voice AI (Inbound Telephony)</strong>
                      <p>Official telephony provider for real inbound customer phone calls</p>
                    </div>
                  </div>
                  <Badge
                    type={
                      integrations.vapi.assistantId ? "green" : "neutral"
                    }
                  >
                    {integrations.vapi.assistantId
                      ? "Configured"
                      : "Optional / Can Skip"}
                  </Badge>
                </div>

                <div className="integration-card-body">
                  <p>
                    Connect your Vapi Assistant to handle real phone calls from customers.
                    If left blank, Voicely will use its interactive Demo Voice assistant.
                  </p>

                  <div className="field-row">
                    <Field
                      label="Vapi Assistant ID"
                      hint="Assistant ID configured in Vapi"
                    >
                      <input
                        type="text"
                        value={integrations.vapi.assistantId}
                        onChange={(e) =>
                          updateVapi("assistantId", e.target.value)
                        }
                        placeholder="e.g. asst_9876543210abcdef"
                      />
                    </Field>

                    <Field
                      label="Vapi Public Client Key"
                      hint="Found in Vapi Dashboard -> API Keys"
                    >
                      <input
                        type="text"
                        value={integrations.vapi.publicKey}
                        onChange={(e) =>
                          updateVapi("publicKey", e.target.value)
                        }
                        placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                      />
                    </Field>
                  </div>

                  <div className="field-row">
                    <Field
                      label="Business Phone Number"
                      hint="Phone number provisioned or imported in Vapi for telephony"
                    >
                      <input
                        type="tel"
                        value={integrations.vapi.phoneNumber}
                        onChange={(e) =>
                          updateVapi("phoneNumber", e.target.value)
                        }
                        placeholder="+1 (555) 789-0123"
                      />
                    </Field>

                    <Field label="Inbound Call Routing">
                      <select
                        value={integrations.vapi.inboundRouting}
                        onChange={(e) =>
                          updateVapi("inboundRouting", e.target.value)
                        }
                      >
                        <option value="direct_assistant">
                          Direct to AI Receptionist (24/7)
                        </option>
                        <option value="business_hours_ai">
                          AI during business hours, Voicemail after
                        </option>
                        <option value="overflow_only">
                          AI as overflow receptionist
                        </option>
                      </select>
                    </Field>
                  </div>

                  {/* Webhook Configuration Guide */}
                  <div className="webhook-guide-card">
                    <div className="guide-header">
                      <strong>Vapi Webhook & Server URL Guide:</strong>
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => {
                          navigator.clipboard.writeText(webhookUrl);
                          setCopiedUrl(true);
                          setTimeout(() => setCopiedUrl(false), 2000);
                        }}
                      >
                        {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
                        {copiedUrl ? "Copied" : "Copy Server URL"}
                      </button>
                    </div>
                    <p>
                      In your Vapi Dashboard under <em>Assistants &gt; Server URL</em>, paste this endpoint.
                      Voicely will automatically handle availability checks, booking creation, and lead logging.
                    </p>
                    <code className="webhook-code-box">{webhookUrl}</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="onboarding-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setStep(3)}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => setStep(5)}
              >
                Continue to Review & Launch <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 5: REVIEW AND LAUNCH ================= */}
        {step === 5 && (
          <div className="onboarding-card fade-in">
            <div className="step-badge">
              <CheckCircle2 size={14} />
              <span>STEP 5 OF 5 · REVIEW AND LAUNCH</span>
            </div>
            <h2>Review your business configuration.</h2>
            <p>
              Inspect your setup summary below. Click "Complete Setup" to provision your business workspace
              and launch your AI receptionist dashboard.
            </p>

            <div className="review-summary-grid">
              {/* Summary Card 1: Account & Profile */}
              <div className="summary-card">
                <div className="summary-card-head">
                  <Building2 size={18} />
                  <strong>Business Profile</strong>
                </div>
                <div className="summary-list">
                  <div className="summary-row">
                    <span>Business Name:</span>
                    <strong>{profile.name || "Untitled Business"}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Category:</span>
                    <span>{profile.category}</span>
                  </div>
                  <div className="summary-row">
                    <span>Owner:</span>
                    <span>
                      {account.ownerName} ({account.workEmail})
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Public Contact:</span>
                    <span>{profile.phone}</span>
                  </div>
                  <div className="summary-row">
                    <span>Address:</span>
                    <span>{profile.address}</span>
                  </div>
                  <div className="summary-row">
                    <span>Timezone:</span>
                    <span>{profile.timezone}</span>
                  </div>
                </div>
              </div>

              {/* Summary Card 2: Services & Hours */}
              <div className="summary-card">
                <div className="summary-card-head">
                  <CalendarDays size={18} />
                  <strong>Services & Availability</strong>
                </div>
                <div className="summary-list">
                  <div className="summary-row">
                    <span>Services Configured:</span>
                    <strong>{services.length} active service(s)</strong>
                  </div>
                  <div className="summary-services-preview">
                    {services.map((s, idx) => (
                      <span key={idx} className="service-preview-pill">
                        {s.name} ({s.duration}m · ${s.price})
                      </span>
                    ))}
                  </div>
                  <div className="summary-row">
                    <span>Open Days:</span>
                    <span>
                      {
                        Object.entries(hours).filter(([_, h]) => h.open).length
                      }{" "}
                      days per week
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Buffer Time:</span>
                    <span>{bookingRules.buffer} mins after bookings</span>
                  </div>
                </div>
              </div>

              {/* Summary Card 3: Integrations */}
              <div className="summary-card">
                <div className="summary-card-head">
                  <Sparkles size={18} />
                  <strong>Integrations Status</strong>
                </div>
                <div className="summary-list">
                  <div className="summary-row">
                    <span>Google Calendar:</span>
                    <Badge
                      type={
                        integrations.googleCalendar.connected
                          ? "green"
                          : "neutral"
                      }
                    >
                      {integrations.googleCalendar.connected
                        ? "Connected"
                        : "Not Connected (Can set in Settings)"}
                    </Badge>
                  </div>
                  <div className="summary-row">
                    <span>Vapi Voice AI:</span>
                    <Badge
                      type={
                        integrations.vapi.assistantId ? "green" : "neutral"
                      }
                    >
                      {integrations.vapi.assistantId
                        ? "Configured"
                        : "Demo Voice Ready (Can set in Settings)"}
                    </Badge>
                  </div>
                  <div className="summary-row">
                    <span>Inbound Phone:</span>
                    <span>
                      {integrations.vapi.phoneNumber ||
                        profile.phone ||
                        "Standard inbound routing"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="onboarding-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setStep(4)}
              >
                <ArrowLeft size={16} /> Back to Integrations
              </button>
              <button
                type="button"
                className="button primary launch-button"
                disabled={busy}
                onClick={handleCompleteSetup}
              >
                {busy ? "Provisioning Workspace..." : "Complete Setup & Launch Dashboard"}
                {!busy && <ArrowRight size={17} />}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
