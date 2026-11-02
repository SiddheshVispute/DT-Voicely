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
} from "lucide-react";
import { useApp } from "../state/AppContext";
import { Brand, Field, Badge } from "../components/ui";

const CATEGORIES = [
  "Healthcare & Clinic",
  "Wellness & Spa",
  "Dental Practice",
  "Salon & Beauty",
  "Consulting & Legal",
  "Real Estate",
  "Home Services & Trades",
  "Financial & Accounting",
  "Fitness & Sports",
  "Automotive Services",
  "Other Services",
];

const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

export default function Onboarding() {
  const { createBusiness } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Form state
  const [business, setBusiness] = useState({
    name: "",
    category: "Healthcare & Clinic",
    phone: "+91 80 5550 0142",
    email: "contact@mybusiness.com",
    address: "100 MG Road, Bengaluru",
    timezone: "Asia/Kolkata",
    duration: 30,
    buffer: 10,
    minNotice: 0,
    advanceDays: 60,
    cancelNotice: 0,
    hours: Object.fromEntries(
      [0, 1, 2, 3, 4, 5, 6].map((day) => [
        day,
        { open: day !== 0, start: "09:00", end: "18:00" },
      ]),
    ),
    services: [
      {
        id: "consultation",
        name: "Initial Consultation",
        duration: 30,
        price: 500,
        description: "A comprehensive first discussion to understand customer needs.",
      },
      {
        id: "standard-session",
        name: "Standard Service Session",
        duration: 60,
        price: 1200,
        description: "Standard full appointment with dedicated professional support.",
      },
    ],
    agent: {
      name: "Maya",
      tone: "Warm and professional",
      greeting: "Hello! Welcome to {business}. I’m {agent}, your receptionist. How can I help you today?",
      faqs: [
        {
          id: "faq-1",
          question: "Where are you located and is parking available?",
          answer: "We have dedicated customer parking on-site and wheelchair access.",
        },
      ],
      prompt: "Be courteous, helpful, and concise. Verify availability and confirm appointment details.",
    },
    vapi: {
      publicKey: "",
      assistantId: "",
      phoneNumber: "",
      enabled: false,
    },
    googleCalendar: {
      connected: false,
      email: "",
      syncEnabled: false,
    },
  });

  const update = (field, value) => setBusiness((b) => ({ ...b, [field]: value }));
  const updateAgent = (field, value) =>
    setBusiness((b) => ({ ...b, agent: { ...b.agent, [field]: value } }));
  const updateVapi = (field, value) =>
    setBusiness((b) => ({ ...b, vapi: { ...b.vapi, [field]: value } }));

  function addService() {
    const id = `service-${Date.now().toString().slice(-4)}`;
    setBusiness((b) => ({
      ...b,
      services: [
        ...b.services,
        {
          id,
          name: "New Service",
          duration: 30,
          price: 600,
          description: "Description of the new service.",
        },
      ],
    }));
  }

  function removeService(index) {
    if (business.services.length <= 1) return;
    setBusiness((b) => ({
      ...b,
      services: b.services.filter((_, i) => i !== index),
    }));
  }

  function updateService(index, field, value) {
    setBusiness((b) => {
      const next = [...b.services];
      next[index] = { ...next[index], [field]: value };
      return { ...b, services: next };
    });
  }

  function toggleDay(day) {
    setBusiness((b) => ({
      ...b,
      hours: {
        ...b.hours,
        [day]: { ...b.hours[day], open: !b.hours[day].open },
      },
    }));
  }

  function updateDayHours(day, field, val) {
    setBusiness((b) => ({
      ...b,
      hours: {
        ...b.hours,
        [day]: { ...b.hours[day], [field]: val },
      },
    }));
  }

  async function handleFinish(e) {
    e?.preventDefault();
    setBusy(true);
    try {
      await createBusiness(business);
      navigate("/app");
    } catch {
      setBusy(false);
    }
  }

  const daysList = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="onboarding-page">
      <header className="onboarding-header">
        <Link to="/app">
          <Brand />
        </Link>
        <div className="onboarding-step-indicator">
          <span>Step {step} of 5</span>
          <div className="step-bar">
            {[1, 2, 3, 4, 5].map((s) => (
              <i key={s} className={s <= step ? "completed" : ""} />
            ))}
          </div>
        </div>
        <Link to="/app" className="text-link">
          Skip to existing workspace
        </Link>
      </header>

      <main className="onboarding-card">
        {/* Step 1: Business Profile */}
        {step === 1 && (
          <div className="step-content">
            <span className="eyebrow">STEP 1 · BUSINESS BASICS</span>
            <h2>Tell us about your business.</h2>
            <p>This information is used by your receptionist to greet callers and answer basic questions.</p>

            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                if (business.name.trim()) setStep(2);
              }}
            >
              <Field label="Business Name" hint="How customers know your establishment">
                <input
                  value={business.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Oak Health Clinic"
                  required
                  autoFocus
                />
              </Field>

              <Field label="Business Category">
                <select
                  value={business.category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="field-row">
                <Field label="Public Phone">
                  <input
                    value={business.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+91 80 5550 0142"
                    required
                  />
                </Field>
                <Field label="Contact Email">
                  <input
                    type="email"
                    value={business.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="contact@example.com"
                    required
                  />
                </Field>
              </div>

              <Field label="Physical Address">
                <input
                  value={business.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Street address, city"
                  required
                />
              </Field>

              <Field label="Operating Time Zone">
                <select
                  value={business.timezone}
                  onChange={(e) => update("timezone", e.target.value)}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="onboarding-actions">
                <button type="submit" className="button" disabled={!business.name.trim()}>
                  Continue to Services <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Services & Pricing */}
        {step === 2 && (
          <div className="step-content">
            <span className="eyebrow">STEP 2 · SERVICES & PRICING</span>
            <h2>What services do you offer?</h2>
            <p>Your AI receptionist will use these to quote prices, explain offerings, and schedule slots.</p>

            <div className="services-setup-list">
              {business.services.map((service, index) => (
                <div key={service.id || index} className="service-setup-card">
                  <div className="service-setup-top">
                    <Field label="Service Name">
                      <input
                        value={service.name}
                        onChange={(e) => updateService(index, "name", e.target.value)}
                        placeholder="e.g. Initial Consultation"
                        required
                      />
                    </Field>
                    {business.services.length > 1 && (
                      <button
                        type="button"
                        className="icon-button danger"
                        aria-label="Remove service"
                        onClick={() => removeService(index)}
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
                        value={service.duration}
                        onChange={(e) =>
                          updateService(index, "duration", parseInt(e.target.value) || 30)
                        }
                      />
                    </Field>
                    <Field label="Price (₹)">
                      <input
                        type="number"
                        min="0"
                        value={service.price}
                        onChange={(e) =>
                          updateService(index, "price", parseFloat(e.target.value) || 0)
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Short Description (for the AI to describe)">
                    <input
                      value={service.description}
                      onChange={(e) => updateService(index, "description", e.target.value)}
                      placeholder="What is included in this service?"
                    />
                  </Field>
                </div>
              ))}

              <button type="button" className="button secondary full" onClick={addService}>
                <Plus size={16} /> Add another service
              </button>
            </div>

            <div className="onboarding-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setStep(1)}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button type="button" className="button" onClick={() => setStep(3)}>
                Continue to Operating Hours <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Operating Hours & Rules */}
        {step === 3 && (
          <div className="step-content">
            <span className="eyebrow">STEP 3 · OPERATING HOURS & RULES</span>
            <h2>When are you open for appointments?</h2>
            <p>Voicely enforces these hours and buffer constraints to prevent double-booking.</p>

            <div className="hours-grid">
              {daysList.map((dayName, idx) => {
                const h = business.hours[idx];
                return (
                  <div key={idx} className={`hour-row ${h.open ? "is-open" : "is-closed"}`}>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={h.open}
                        onChange={() => toggleDay(idx)}
                      />
                      <strong>{dayName}</strong>
                    </label>
                    {h.open ? (
                      <div className="time-range">
                        <input
                          type="time"
                          value={h.start}
                          onChange={(e) => updateDayHours(idx, "start", e.target.value)}
                        />
                        <span>to</span>
                        <input
                          type="time"
                          value={h.end}
                          onChange={(e) => updateDayHours(idx, "end", e.target.value)}
                        />
                      </div>
                    ) : (
                      <span className="closed-label">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rules-section">
              <h3>Booking Rules</h3>
              <div className="field-row">
                <Field label="Buffer between bookings (minutes)">
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={business.buffer}
                    onChange={(e) => update("buffer", parseInt(e.target.value) || 0)}
                  />
                </Field>
                <Field label="Advance booking limit (days)">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={business.advanceDays}
                    onChange={(e) => update("advanceDays", parseInt(e.target.value) || 30)}
                  />
                </Field>
              </div>
            </div>

            <div className="onboarding-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setStep(2)}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button type="button" className="button" onClick={() => setStep(4)}>
                Continue to AI Receptionist <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: AI Receptionist Configuration */}
        {step === 4 && (
          <div className="step-content">
            <span className="eyebrow">STEP 4 · AI RECEPTIONIST</span>
            <h2>Personalize your voice assistant.</h2>
            <p>Give your receptionist a name, style, and greeting message.</p>

            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                setStep(5);
              }}
            >
              <div className="field-row">
                <Field label="Receptionist Name">
                  <input
                    value={business.agent.name}
                    onChange={(e) => updateAgent("name", e.target.value)}
                    placeholder="e.g. Maya, Alex, Sarah"
                    required
                  />
                </Field>
                <Field label="Speaking Style / Tone">
                  <select
                    value={business.agent.tone}
                    onChange={(e) => updateAgent("tone", e.target.value)}
                  >
                    <option value="Warm and professional">Warm and professional</option>
                    <option value="Friendly and welcoming">Friendly and welcoming</option>
                    <option value="Polite and formal">Polite and formal</option>
                    <option value="Empathetic and caring">Empathetic and caring</option>
                  </select>
                </Field>
              </div>

              <Field
                label="Greeting Message"
                hint="Tokens {business} and {agent} are automatically substituted"
              >
                <textarea
                  rows={3}
                  value={business.agent.greeting}
                  onChange={(e) => updateAgent("greeting", e.target.value)}
                  required
                />
              </Field>

              <div className="greeting-preview-box">
                <span className="preview-label">Live Greeting Preview:</span>
                <p>
                  "
                  {business.agent.greeting
                    .replaceAll("{business}", business.name || "Your Business")
                    .replaceAll("{agent}", business.agent.name || "Receptionist")}
                  "
                </p>
              </div>

              <div className="onboarding-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setStep(3)}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" className="button">
                  Continue to Integrations <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 5: Integrations (Vapi & Google Calendar) */}
        {step === 5 && (
          <div className="step-content">
            <span className="eyebrow">STEP 5 · INTEGRATIONS (OPTIONAL)</span>
            <h2>Connect your tools.</h2>
            <p>
              Steps requiring external keys can be skipped now and completed later in Settings.
            </p>

            {/* Vapi Card */}
            <div className="integration-setup-card">
              <div className="card-top">
                <div className="card-badge-row">
                  <AudioLines size={20} />
                  <strong>Vapi AI Voice</strong>
                </div>
                <Badge type={business.vapi.publicKey && business.vapi.assistantId ? "green" : "neutral"}>
                  {business.vapi.publicKey && business.vapi.assistantId ? "Configured" : "Optional / Can Skip"}
                </Badge>
              </div>
              <p>
                Connect Vapi for real-time AI phone calls and browser voice. If left blank, Voicely will use its built-in Demo Voice receptionist.
              </p>

              <div className="field-row">
                <Field label="Vapi Public Client Key">
                  <input
                    value={business.vapi.publicKey}
                    onChange={(e) => updateVapi("publicKey", e.target.value)}
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  />
                </Field>
                <Field label="Vapi Assistant ID">
                  <input
                    value={business.vapi.assistantId}
                    onChange={(e) => updateVapi("assistantId", e.target.value)}
                    placeholder="e.g. asst_9a8b7c6d"
                  />
                </Field>
              </div>
            </div>

            {/* Google Calendar Card */}
            <div className="integration-setup-card">
              <div className="card-top">
                <div className="card-badge-row">
                  <Calendar size={20} />
                  <strong>Google Calendar</strong>
                </div>
                <Badge type="neutral">Not connected</Badge>
              </div>
              <p>
                Two-way calendar sync allows Voicely to check external appointments and push bookings. You can link your Google Calendar anytime from Settings.
              </p>
            </div>

            <div className="onboarding-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setStep(4)}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="button"
                className="button primary"
                disabled={busy}
                onClick={handleFinish}
              >
                <Check size={16} /> Launch {business.name || "Workspace"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
