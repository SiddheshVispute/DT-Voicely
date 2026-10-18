import { useEffect, useState } from "react";
import {
  Save,
  Plus,
  Trash2,
  ShieldCheck,
  Database,
  RotateCcw,
  Cloud,
  LogIn,
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
export default function Settings() {
  const { data, repository, perform, setError, switchRepository, active } =
      useApp(),
    [draft, setDraft] = useState(() => structuredClone(data.config)),
    [busy, setBusy] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  useEffect(() => setDraft(structuredClone(data.config)), [data.config]);
  const field = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await perform(
        (r) => r.saveConfig(draft),
        "Business settings saved. Availability now uses these settings.",
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
  return (
    <>
      <PageTitle
        eyebrow="A RECEPTIONIST THAT KNOWS YOU"
        title="The details make the difference."
        description="Tell Voicely how your business works. Your receptionist will follow along."
      />
      <form onSubmit={save} className="settings-form">
        <section className="panel settings-section">
          <SectionHead
            title="Business profile"
            subtitle="The information shared with your customers."
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
            <Field label="Business category">
              <input
                value={draft.category}
                maxLength={100}
                onChange={(e) => field("category", e.target.value)}
              />
            </Field>
            <Field label="Address">
              <input
                value={draft.address}
                maxLength={200}
                onChange={(e) => field("address", e.target.value)}
              />
            </Field>
            <Field label="Business phone">
              <input
                type="tel"
                value={draft.phone}
                maxLength={30}
                onChange={(e) => field("phone", e.target.value)}
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
                  "Australia/Sydney",
                  "UTC",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </datalist>
            </Field>
            <Field
              label="Default appointment duration (minutes)"
              hint="Each service can override this duration."
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
        <section className="panel settings-section">
          <SectionHead
            title="Services"
            subtitle="What customers can ask about and book."
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
        <div className="settings-columns">
          <section className="panel settings-section">
            <SectionHead
              title="Working hours"
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
              title="Booking preferences"
              subtitle="A little breathing room between appointments."
            />
            <div className="preference-fields">
              {[
                ["buffer", "Buffer between bookings (minutes)", 0, 120],
                ["minNotice", "Minimum notice (minutes)", 0, 10080],
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
              Existing appointments keep their original duration and buffer. New
              bookings respect both existing and current buffers.
            </p>
          </section>
        </div>
        <div className="settings-save">
          <span>Changes apply after saving.</span>
          <button className="button" disabled={busy}>
            <Save size={16} />
            {busy ? "Saving…" : "Save business settings"}
          </button>
        </div>
      </form>
      <section className="panel settings-section integration-panel">
        <SectionHead
          title="Storage & integrations"
          subtitle="Clear about what’s connected, and what isn’t."
        >
          <Badge type="green">
            {repository.mode === "demo" ? "Local Demo Mode" : "Supabase Mode"}
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
          <Badge>Browser voice</Badge>
        </div>
      </section>
    </>
  );
}
