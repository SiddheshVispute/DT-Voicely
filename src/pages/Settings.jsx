import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Save,
  Plus,
  Trash2,
  ShieldCheck,
  Database,
  RotateCcw,
  Cloud,
  LogIn,
  Mic,
  Calendar,
  Users,
  Code,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Building2,
  Sparkles,
  Key,
  Check,
} from "lucide-react";
import { useApp } from "../state/AppContext";
import { PageTitle, SectionHead, Field, Badge } from "../components/ui";
import {
  cloudConfigured,
  getSupabase,
  vapiIntegration,
} from "../services/integrations";
import { createSupabaseRepository } from "../data/supabaseRepository";
import { createLocalRepository } from "../data/localRepository";
import { defaultConfig } from "../domain/config";
import { useTheme } from "../state/ThemeContext";
import { Sun, Moon } from "lucide-react";
import WebsiteWidget from "../components/WebsiteWidget";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const {
    data,
    repository,
    perform,
    setError,
    setToast,
    switchRepository,
    active,
    openLiveCall,
    addMember,
    switchBusiness,
  } = useApp();

  const [draft, setDraft] = useState(() => structuredClone(data.config));
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "Employee",
  });

  useEffect(() => setDraft(structuredClone(data.config)), [data.config]);

  const field = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const subfield = (parent, k, v) =>
    setDraft((d) => ({
      ...d,
      [parent]: {
        ...(d[parent] || {}),
        [k]: v,
      },
    }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await perform(
        (r) => r.saveConfig(draft),
        "Business settings saved. Availability and voice assistant now use these settings.",
      );
    } catch {
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (active) {
      setError("End the current conversation before resetting demo data.");
      return;
    }
    if (
      !window.confirm(
        "Reset all local demo appointments, conversations, confirmations, and settings? Cloud data will not be touched.",
      )
    )
      return;
    try {
      await perform(
        (r) => r.reset(),
        "Demo data reset. Fresh fictional sample records are ready.",
      );
    } catch {}
  }

  async function connect(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (active)
        throw new Error(
          "End the current conversation before switching storage.",
        );
      const client = getSupabase();
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const { error: bootstrapError } = await client.rpc("create_business", {
        p_config: structuredClone(defaultConfig),
      });
      if (bootstrapError) throw bootstrapError;
      await switchRepository(await createSupabaseRepository());
      setPassword("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function useDemo() {
    try {
      await switchRepository(createLocalRepository());
      const { error } = await getSupabase().auth.signOut();
      if (error)
        setError(
          `Demo Mode is active, but cloud sign-out failed: ${error.message}`,
        );
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!newMember.name || !newMember.email) return;
    try {
      await addMember(newMember);
      setNewMember({ name: "", email: "", role: "Employee" });
      setToast(`Added ${newMember.name} as ${newMember.role}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  const vapiConfigured = Boolean(
    draft.vapi?.publicKey?.trim() && draft.vapi?.assistantId?.trim(),
  );

  const googleCalConfigured = Boolean(
    draft.googleCalendar?.clientId?.trim() &&
      draft.googleCalendar?.syncEnabled,
  );

  const widgetScriptSnippet = `<!-- Voicely AI Voice & Chat Receptionist Widget -->
<script
  src="${window.location.origin}/widget.js"
  data-business-id="${data.activeBusinessId || "biz_main"}"
  data-theme="${draft.widget?.themeColor || "#6254e8"}"
  async>
</script>`;

  const webhookUrl = `${window.location.origin}/api/vapi/webhook`;

  const membersList = data.members && data.members.length > 0 ? data.members : [
    { id: "m1", name: "Sarah Jenkins", email: "sarah@apexphysio.com", role: "Owner", status: "Active" },
    { id: "m2", name: "David Kim", email: "david@apexphysio.com", role: "Admin", status: "Active" },
    { id: "m3", name: "Elena Rostova", email: "elena@apexphysio.com", role: "Employee", status: "Active" },
  ];

  const businessesList = data.businesses && data.businesses.length > 0 ? data.businesses : [
    { id: data.activeBusinessId || "biz_main", name: draft.name, category: draft.category || "Healthcare" },
  ];

  return (
    <>
      <PageTitle
        eyebrow="BUSINESS & INTEGRATIONS"
        title="Settings & Workspace Management"
        description="Configure your business profile, Vapi AI voice receptionist, Google Calendar, website widget, and staff roles."
      />

      <form onSubmit={save} className="settings-form">
        {/* Appearance & Theme */}
        <section className="panel settings-section" id="appearance-theme">
          <SectionHead
            title="Appearance & Theme"
            subtitle="Customize Voicely interface theme across light mode and deep dark mode."
          >
            <Badge type="green">
              {theme === "dark" ? "Dark Theme Active" : "Light Theme Active"}
            </Badge>
          </SectionHead>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginTop: "1rem" }}>
            <button
              type="button"
              className={`theme-card-option ${theme === "light" ? "active" : ""}`}
              onClick={() => setTheme("light")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "1rem",
                borderRadius: "10px",
                border: theme === "light" ? "2px solid var(--primary)" : "1px solid var(--line)",
                background: "var(--surface)",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(98,84,232,0.1)", color: "var(--primary)" }}>
                <Sun size={20} />
              </div>
              <div>
                <strong style={{ display: "block", color: "var(--ink)", fontSize: "0.95rem" }}>Light Mode</strong>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Clean & crisp</span>
              </div>
            </button>

            <button
              type="button"
              className={`theme-card-option ${theme === "dark" ? "active" : ""}`}
              onClick={() => setTheme("dark")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "1rem",
                borderRadius: "10px",
                border: theme === "dark" ? "2px solid var(--primary)" : "1px solid var(--line)",
                background: "var(--surface)",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(98,84,232,0.1)", color: "var(--primary)" }}>
                <Moon size={20} />
              </div>
              <div>
                <strong style={{ display: "block", color: "var(--ink)", fontSize: "0.95rem" }}>Dark Mode</strong>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Deep navy & slate</span>
              </div>
            </button>
          </div>
        </section>

        {/* Business Profile */}
        <section className="panel settings-section">
          <SectionHead
            title="Business profile"
            subtitle="The information shared with your customers and AI receptionist."
          />
          <div className="form-grid">
            <Field label="Business name">
              <input
                required
                maxLength={100}
                value={draft.name}
                onChange={(e) => field("name", e.target.value)}
              />
            </Field>
            <Field label="Business category / industry">
              <input
                value={draft.category || ""}
                maxLength={100}
                placeholder="e.g. Physiotherapy & Sports Clinic, Dental, Law Firm"
                onChange={(e) => field("category", e.target.value)}
              />
            </Field>
            <Field label="Contact email">
              <input
                type="email"
                value={draft.email || ""}
                maxLength={100}
                placeholder="contact@yourbusiness.com"
                onChange={(e) => field("email", e.target.value)}
              />
            </Field>
            <Field label="Business phone">
              <input
                type="tel"
                value={draft.phone}
                maxLength={30}
                placeholder="+1 (555) 019-2834"
                onChange={(e) => field("phone", e.target.value)}
              />
            </Field>
            <Field label="Address / location">
              <input
                value={draft.address}
                maxLength={200}
                placeholder="e.g. 450 Market St, Suite 200, San Francisco"
                onChange={(e) => field("address", e.target.value)}
              />
            </Field>
            <Field
              label="Timezone"
              hint="All availability and customer appointment times use this timezone."
            >
              <input
                required
                list="timezones"
                value={draft.timezone}
                onChange={(e) => field("timezone", e.target.value)}
              />
              <datalist id="timezones">
                {[
                  "Asia/Kolkata",
                  "Europe/London",
                  "America/New_York",
                  "America/Los_Angeles",
                  "America/Chicago",
                  "Australia/Sydney",
                  "UTC",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </datalist>
            </Field>
            <Field
              label="Default appointment duration (minutes)"
              hint="Each individual service can override this duration."
            >
              <input
                type="number"
                min="5"
                max="480"
                required
                value={draft.duration}
                onChange={(e) => field("duration", Number(e.target.value))}
              />
            </Field>
          </div>
        </section>

        {/* Services */}
        <section className="panel settings-section">
          <SectionHead
            title="Services & Pricing"
            subtitle="What customers can ask about, get quotes for, and book."
          >
            <button
              type="button"
              className="button secondary small"
              onClick={() =>
                field("services", [
                  ...draft.services,
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    description: "",
                    duration: draft.duration,
                    price: 0,
                  },
                ])
              }
            >
              <Plus size={15} /> Add service
            </button>
          </SectionHead>
          <div className="service-editor">
            {draft.services.map((s, i) => (
              <div className="service-edit-row" key={s.id}>
                <Field label="Service name">
                  <input
                    required
                    maxLength={80}
                    value={s.name}
                    placeholder="e.g. Initial Assessment"
                    onChange={(e) =>
                      field(
                        "services",
                        draft.services.map((x, j) =>
                          j === i ? { ...x, name: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Description">
                  <input
                    maxLength={250}
                    value={s.description}
                    placeholder="Brief description for AI"
                    onChange={(e) =>
                      field(
                        "services",
                        draft.services.map((x, j) =>
                          j === i ? { ...x, description: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Minutes">
                  <input
                    type="number"
                    min="5"
                    max="480"
                    required
                    value={s.duration}
                    onChange={(e) =>
                      field(
                        "services",
                        draft.services.map((x, j) =>
                          j === i
                            ? { ...x, duration: Number(e.target.value) }
                            : x,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Price (₹)">
                  <input
                    type="number"
                    min="0"
                    required
                    value={s.price}
                    onChange={(e) =>
                      field(
                        "services",
                        draft.services.map((x, j) =>
                          j === i ? { ...x, price: Number(e.target.value) } : x,
                        ),
                      )
                    }
                  />
                </Field>
                <button
                  type="button"
                  className="icon-button remove-service"
                  aria-label={`Remove ${s.name || "service"}`}
                  disabled={draft.services.length <= 1}
                  onClick={() =>
                    field(
                      "services",
                      draft.services.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Working Hours & Preferences */}
        <div className="settings-columns">
          <section className="panel settings-section">
            <SectionHead
              title="Operating hours"
              subtitle="Appointments must fit inside an open day."
            />
            <div className="hours-editor">
              {[
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ].map((name, i) => (
                <div className="hours-row" key={name}>
                  <label>
                    <input
                      type="checkbox"
                      checked={draft.hours[i].open}
                      onChange={(e) =>
                        field("hours", {
                          ...draft.hours,
                          [i]: { ...draft.hours[i], open: e.target.checked },
                        })
                      }
                    />
                    {name}
                  </label>
                  {draft.hours[i].open ? (
                    <>
                      <input
                        aria-label={`${name} opens`}
                        type="time"
                        required
                        value={draft.hours[i].start}
                        onChange={(e) =>
                          field("hours", {
                            ...draft.hours,
                            [i]: { ...draft.hours[i], start: e.target.value },
                          })
                        }
                      />
                      <span>–</span>
                      <input
                        aria-label={`${name} closes`}
                        type="time"
                        required
                        value={draft.hours[i].end}
                        onChange={(e) =>
                          field("hours", {
                            ...draft.hours,
                            [i]: { ...draft.hours[i], end: e.target.value },
                          })
                        }
                      />
                    </>
                  ) : (
                    <span className="closed-label">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="panel settings-section">
            <SectionHead
              title="Booking rules & notice"
              subtitle="Breathing room and buffers between bookings."
            />
            <div className="preference-fields">
              {[
                ["buffer", "Buffer between bookings (minutes)", 0, 120],
                ["minNotice", "Minimum notice required (minutes)", 0, 10080],
                ["advanceDays", "Book up to (days ahead)", 1, 365],
                [
                  "cancelNotice",
                  "Cancellation cutoff (minutes before)",
                  0,
                  10080,
                ],
              ].map(([key, label, min, max]) => (
                <Field label={label} key={key}>
                  <input
                    type="number"
                    required
                    min={min}
                    max={max}
                    value={draft[key]}
                    onChange={(e) => field(key, Number(e.target.value))}
                  />
                </Field>
              ))}
            </div>
            <p className="data-note">
              Existing appointments retain their original duration and buffer. New
              bookings respect both existing and current buffers.
            </p>
          </section>
        </div>

        {/* Vapi Voice AI Configuration */}
        <section className="panel settings-section" id="vapi-config">
          <SectionHead
            title="Vapi AI Voice Receptionist"
            subtitle="Configure your official Vapi credentials for real-time speech AI."
          >
            <Badge type={vapiConfigured ? "green" : "neutral"}>
              <i />
              {vapiConfigured
                ? "Live Vapi Voice Active"
                : "Demo Voice Mode (Zero keys required)"}
            </Badge>
          </SectionHead>

          {/* Vapi Quick Setup Guide -- shown when not yet configured */}
          {!vapiConfigured && (
            <div style={{ marginBottom: "1.25rem", padding: "1rem 1.25rem", background: "linear-gradient(135deg, rgba(98,84,232,0.08) 0%, rgba(139,92,246,0.05) 100%)", border: "1px solid rgba(98,84,232,0.25)", borderRadius: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
                <Key size={16} color="#818cf8" />
                <strong style={{ fontSize: "0.9rem" }}>Quick Setup: 3 steps to activate real Vapi voice calls</strong>
              </div>
              <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <li style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                  <strong style={{ color: "var(--color-text)" }}>Get your Public Key</strong> � Open{ }
                  <a href="https://dashboard.vapi.ai/account" target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", textDecoration: "underline" }}>dashboard.vapi.ai ? Account ? API Keys</a>{ }
                  and copy your Public key (not the sk_vapi_... secret).
                </li>
                <li style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                  <strong style={{ color: "var(--color-text)" }}>Create an Assistant</strong> � Visit{ }
                  <a href="https://dashboard.vapi.ai/assistants" target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", textDecoration: "underline" }}>Vapi ? Assistants ? New Assistant</a>
                  . Copy the Assistant ID from its detail page.
                </li>
                <li style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                  <strong style={{ color: "var(--color-text)" }}>Paste both keys below</strong> � click Save, then Test Live Voice Conversation to verify.
                </li>
              </ol>
              <p style={{ margin: "0.75rem 0 0", fontSize: "0.8rem", color: "var(--color-muted)", fontStyle: "italic" }}>
                Without keys, Voicely uses its built-in Interactive Voice Agent (no API needed).
              </p>
            </div>
          )}

          <div className="vapi-settings-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Field
              label="Vapi Public Client Key"
              hint="Required for browser Web SDK voice calls. Found in Vapi Dashboard -> API Keys."
            >
              <input
                type="text"
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                value={draft.vapi?.publicKey || ""}
                onChange={(e) => subfield("vapi", "publicKey", e.target.value)}
              />
            </Field>

            <Field
              label="Vapi Assistant ID"
              hint="Target assistant ID configured for this business in Vapi."
            >
              <input
                type="text"
                placeholder="e.g. asst_9876543210abcdef"
                value={draft.vapi?.assistantId || ""}
                onChange={(e) => subfield("vapi", "assistantId", e.target.value)}
              />
            </Field>

            <Field
              label="Vapi Server Secret / Private Key"
              hint="Server-side secret used to verify inbound webhook signatures. Kept confidential."
            >
              <input
                type="password"
                placeholder="sk_vapi_••••••••••••••••"
                value={draft.vapi?.serverSecret || ""}
                onChange={(e) => subfield("vapi", "serverSecret", e.target.value)}
              />
            </Field>

            <Field
              label="Business Inbound Phone Number"
              hint="Optional phone number provisioned in Vapi or Twilio for telephony routing."
            >
              <input
                type="tel"
                placeholder="+1 (555) 789-0123"
                value={draft.vapi?.phoneNumber || ""}
                onChange={(e) => subfield("vapi", "phoneNumber", e.target.value)}
              />
            </Field>
          </div>

          <div
            style={{
              marginTop: "1.25rem",
              padding: "1rem",
              background: "rgba(98, 84, 232, 0.08)",
              border: "1px solid rgba(98, 84, 232, 0.2)",
              borderRadius: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Code size={16} /> Server Webhook URL
                </strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--color-muted)" }}>
                  Set this URL as the Server URL in your Vapi Assistant dashboard to receive end-of-call reports and live tool requests.
                </p>
                <code style={{ display: "inline-block", marginTop: "6px", padding: "4px 8px", background: "rgba(0,0,0,0.3)", borderRadius: "4px", fontSize: "0.82rem" }}>
                  {webhookUrl}
                </code>
              </div>
              <button
                type="button"
                className="button secondary small"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  setCopiedWebhook(true);
                  setTimeout(() => setCopiedWebhook(false), 2000);
                }}
              >
                {copiedWebhook ? <Check size={14} /> : <Copy size={14} />}
                {copiedWebhook ? "Copied" : "Copy URL"}
              </button>
            </div>
          </div>

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="button"
              className="button small"
              onClick={() => openLiveCall("vapi")}
            >
              <Mic size={15} /> Test Live Voice Conversation
            </button>
            <span style={{ fontSize: "0.82rem", color: "var(--color-muted)" }}>
              {vapiConfigured
                ? "Will connect to your live Vapi assistant."
                : "Missing Vapi keys? Voicely automatically launches interactive Demo Voice mode."}
            </span>
          </div>
        </section>

        {/* Google Calendar Integration */}
        <section className="panel settings-section">
          <SectionHead
            title="Google Calendar Integration"
            subtitle="Sync bookings, conflict checks, and cancellations directly with Google Calendar."
          >
            <Badge type={googleCalConfigured ? "green" : "neutral"}>
              <i />
              {googleCalConfigured ? "Connected & Syncing" : "Not connected"}
            </Badge>
          </SectionHead>

          <div className="form-grid">
            <Field
              label="Google OAuth Client ID"
              hint="From Google Cloud Console -> APIs & Credentials."
            >
              <input
                type="text"
                placeholder="e.g. 123456789-abcdefg.apps.googleusercontent.com"
                value={draft.googleCalendar?.clientId || ""}
                onChange={(e) =>
                  subfield("googleCalendar", "clientId", e.target.value)
                }
              />
            </Field>

            <Field
              label="Google Calendar ID"
              hint="Defaults to 'primary' for your main calendar."
            >
              <input
                type="text"
                placeholder="primary or user@business.com"
                value={draft.googleCalendar?.calendarId || "primary"}
                onChange={(e) =>
                  subfield("googleCalendar", "calendarId", e.target.value)
                }
              />
            </Field>

            <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem" }}>
              <label className="toggle-label" style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={draft.googleCalendar?.syncEnabled || false}
                  onChange={(e) =>
                    subfield("googleCalendar", "syncEnabled", e.target.checked)
                  }
                />
                <strong>Enable Two-Way Calendar Synchronization</strong>
              </label>
              <p style={{ margin: "4px 0 0 28px", fontSize: "0.82rem", color: "var(--color-muted)" }}>
                When enabled, new AI appointments create Google Calendar events, and busy Google Calendar blocks are respected during voice availability checks.
              </p>
            </div>
          </div>
        </section>

        {/* Website Widget Customization & Embed */}
        <section className="panel settings-section">
          <SectionHead
            title="Website Embeddable Widget"
            subtitle="Deploy your AI voice and booking assistant onto any website."
          >
            <Badge type={draft.widget?.enabled ? "green" : "neutral"}>
              <i />
              {draft.widget?.enabled ? "Widget Active" : "Widget Disabled"}
            </Badge>
          </SectionHead>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
            <div>
              <div className="form-grid" style={{ marginBottom: "1rem" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label className="toggle-label" style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={draft.widget?.enabled ?? true}
                      onChange={(e) =>
                        subfield("widget", "enabled", e.target.checked)
                      }
                    />
                    <strong>Enable Website Embed Widget</strong>
                  </label>
                </div>

                <Field
                  label="Widget Greeting Message"
                  hint="First greeting shown when visitors open the widget."
                >
                  <textarea
                    rows={2}
                    value={draft.widget?.welcomeMessage || ""}
                    placeholder="Hello! Welcome to our clinic. How can I help you today?"
                    onChange={(e) =>
                      subfield("widget", "welcomeMessage", e.target.value)
                    }
                  />
                </Field>

                <Field label="Widget Accent Theme Color">
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="color"
                      value={draft.widget?.themeColor || "#6254e8"}
                      onChange={(e) =>
                        subfield("widget", "themeColor", e.target.value)
                      }
                      style={{ width: "42px", height: "36px", padding: "2px", cursor: "pointer", background: "transparent" }}
                    />
                    <input
                      type="text"
                      value={draft.widget?.themeColor || "#6254e8"}
                      onChange={(e) =>
                        subfield("widget", "themeColor", e.target.value)
                      }
                      style={{ width: "120px" }}
                    />
                  </div>
                </Field>
              </div>

              <div>
                <strong style={{ fontSize: "0.9rem" }}>HTML Embed Snippet</strong>
                <p style={{ margin: "4px 0 8px", fontSize: "0.82rem", color: "var(--color-muted)" }}>
                  Paste this snippet right before the closing &lt;/body&gt; tag of your website HTML.
                </p>
                <div style={{ position: "relative" }}>
                  <pre
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      padding: "1rem",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      overflowX: "auto",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {widgetScriptSnippet}
                  </pre>
                  <button
                    type="button"
                    className="button secondary small"
                    style={{ position: "absolute", top: "8px", right: "8px" }}
                    onClick={() => {
                      navigator.clipboard.writeText(widgetScriptSnippet);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2000);
                    }}
                  >
                    {copiedScript ? <Check size={14} /> : <Copy size={14} />}
                    {copiedScript ? "Copied" : "Copy Code"}
                  </button>
                </div>
              </div>
            </div>

            {/* Live Interactive Preview Box */}
            <div
              style={{
                background: "var(--color-surface, rgba(255,255,255,0.03))",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                padding: "1.25rem",
                position: "relative",
                minHeight: "340px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                <span className="badge-pill" style={{ display: "inline-block", marginBottom: "6px", fontSize: "0.75rem", background: "rgba(98,84,232,0.15)", color: "var(--color-primary, #6254e8)", padding: "2px 8px", borderRadius: "100px" }}>
                  Interactive Live Preview
                </span>
                <h4 style={{ margin: 0, fontSize: "0.95rem" }}>Customer Experience</h4>
                <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--color-muted)" }}>
                  Click the launcher icon in the corner to test the widget tabs.
                </p>
              </div>

              {/* Render WebsiteWidget in preview mode */}
              <div style={{ width: "100%", height: "260px", position: "relative", overflow: "hidden", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
                <WebsiteWidget
                  config={draft}
                  state={data}
                  previewOnly={true}
                  onAction={() => {}}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Save Bar */}
        <div className="settings-save">
          <span>Changes apply immediately across your AI receptionist and booking engine.</span>
          <button className="button" disabled={busy}>
            <Save size={16} />
            {busy ? "Saving…" : "Save all settings"}
          </button>
        </div>
      </form>

      {/* Team Members & Access Roles */}
      <section className="panel settings-section" style={{ marginTop: "2rem" }}>
        <SectionHead
          title="Team Members & Permissions"
          subtitle="Manage who has access to this business workspace and assign appointment bookings."
        />

        <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
          <table className="leads-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {membersList.map((m) => (
                <tr key={m.id || m.email}>
                  <td>
                    <strong>{m.name}</strong>
                  </td>
                  <td style={{ color: "var(--color-muted)" }}>{m.email}</td>
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        background:
                          m.role === "Owner"
                            ? "rgba(98, 84, 232, 0.2)"
                            : m.role === "Admin"
                              ? "rgba(59, 130, 246, 0.2)"
                              : "rgba(107, 114, 128, 0.2)",
                        color:
                          m.role === "Owner"
                            ? "#818cf8"
                            : m.role === "Admin"
                              ? "#60a5fa"
                              : "#9ca3af",
                      }}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.82rem", color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle2 size={13} /> Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Member Form */}
        <form
          onSubmit={handleAddMember}
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-end",
            background: "var(--color-surface, rgba(255,255,255,0.03))",
            padding: "1rem",
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
          }}
        >
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.82rem", marginBottom: "4px" }}>Full Name</label>
            <input
              required
              placeholder="e.g. Liam Patel"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontSize: "0.82rem", marginBottom: "4px" }}>Email Address</label>
            <input
              required
              type="email"
              placeholder="liam@business.com"
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
            />
          </div>
          <div style={{ width: "160px" }}>
            <label style={{ display: "block", fontSize: "0.82rem", marginBottom: "4px" }}>Workspace Role</label>
            <select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
            >
              <option value="Employee">Employee</option>
              <option value="Admin">Admin</option>
              <option value="Owner">Owner</option>
            </select>
          </div>
          <button type="submit" className="button small">
            <Plus size={15} /> Add Member
          </button>
        </form>

        <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <div style={{ padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", fontSize: "0.8rem", color: "var(--color-muted)" }}>
            <strong style={{ color: "var(--color-text)", display: "block", marginBottom: "2px" }}>Owner</strong>
            Full administrative control, billing, API keys, member management, and workspace deletion.
          </div>
          <div style={{ padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", fontSize: "0.8rem", color: "var(--color-muted)" }}>
            <strong style={{ color: "var(--color-text)", display: "block", marginBottom: "2px" }}>Admin</strong>
            Manage all appointments, leads, business hours, services, and call logs. Cannot change owner roles.
          </div>
          <div style={{ padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", fontSize: "0.8rem", color: "var(--color-muted)" }}>
            <strong style={{ color: "var(--color-text)", display: "block", marginBottom: "2px" }}>Employee</strong>
            View appointments, manage assigned bookings, view customer details, and add lead notes.
          </div>
        </div>
      </section>

      {/* Multi-Tenant Workspaces */}
      <section className="panel settings-section" style={{ marginTop: "2rem" }}>
        <SectionHead
          title="Multi-Tenant Workspaces"
          subtitle="Each business operates in an isolated environment with separate data."
        >
          <Link to="/app/onboarding" className="button secondary small">
            <Plus size={15} /> + Register New Business
          </Link>
        </SectionHead>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {businessesList.map((biz) => {
            const isCurrent = biz.id === (data.activeBusinessId || "biz_main");
            return (
              <div
                key={biz.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.85rem 1rem",
                  borderRadius: "8px",
                  background: isCurrent ? "rgba(98, 84, 232, 0.1)" : "rgba(255,255,255,0.03)",
                  border: isCurrent ? "1px solid rgba(98, 84, 232, 0.4)" : "1px solid var(--color-border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Building2 size={20} color={isCurrent ? "#818cf8" : "var(--color-muted)"} />
                  <div>
                    <strong>{biz.name || "Business Workspace"}</strong>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginLeft: "8px" }}>
                      ID: {biz.id} · {biz.category || "General"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {isCurrent ? (
                    <Badge type="green">
                      <i /> Current Active Workspace
                    </Badge>
                  ) : (
                    <button
                      type="button"
                      className="button secondary small"
                      onClick={() => switchBusiness(biz.id)}
                    >
                      Switch to Workspace
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Storage & Integrations */}
      <section className="panel settings-section integration-panel" style={{ marginTop: "2rem" }}>
        <SectionHead
          title="Storage & Database Architecture"
          subtitle="Clear about what’s connected, and what isn’t."
        >
          <Badge type="green">
            {repository.mode === "demo" ? "Local Demo Mode" : "Supabase PostgreSQL Mode"}
          </Badge>
        </SectionHead>

        <div className="integration-row">
          <Database size={23} />
          <div>
            <strong>Persistent local demo</strong>
            <p>
              Stored on this browser. Sample records are fictional. Reset
              affects only local demo data.
            </p>
          </div>
          {repository.mode === "demo" ? (
            <button className="button secondary small" onClick={reset}>
              <RotateCcw size={14} /> Reset Demo Data
            </button>
          ) : (
            <button className="button secondary small" onClick={useDemo}>
              Return to Demo Mode
            </button>
          )}
        </div>

        <div className="integration-row">
          <Cloud size={23} />
          <div>
            <strong>Supabase PostgreSQL</strong>
            <p>
              {cloudConfigured
                ? "Public configuration detected. Sign in with an existing Supabase Auth user to use your tenant."
                : "Not configured. Demo Mode needs no credentials. See README for database and auth setup."}
            </p>
          </div>
          <Badge>
            {repository.mode === "cloud"
              ? "Connected"
              : cloudConfigured
                ? "Available"
                : "Optional"}
          </Badge>
        </div>

        {cloudConfigured && repository.mode === "demo" && (
          <form className="cloud-signin" onSubmit={connect}>
            <Field label="Supabase account email">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Password">
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <button className="button small" disabled={busy}>
              <LogIn size={15} /> Connect cloud
            </button>
          </form>
        )}

        <div className="integration-row">
          <ShieldCheck size={23} />
          <div>
            <strong>Voice, SMS & phone calls</strong>
            <p>
              {vapiIntegration.description} SMS is a labelled preview, never
              delivered.
            </p>
          </div>
          <Badge>Vapi Web SDK</Badge>
        </div>
      </section>
    </>
  );
}
