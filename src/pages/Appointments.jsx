import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { useApp } from "../state/AppContext";
import { PageTitle, Badge, Modal, Field, Empty } from "../components/ui";
import BookingDetails from "../components/BookingDetails";
import { today, addDays, weekday, formatSlot } from "../domain/time";
import { Temporal } from "@js-temporal/polyfill";
import { alternatives, validateBooking } from "../domain/booking";
export default function Appointments() {
  const { data } = useApp(),
    [params, setParams] = useSearchParams(),
    [view, setView] = useState("list"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [manual, setManual] = useState(false),
    [month, setMonth] = useState(today(data.config.timezone).slice(0, 7));
  const selected = data.appointments.find(
    (a) => a.id === params.get("booking"),
  );
  const list = [...data.appointments]
    .filter(
      (a) =>
        (filter === "all" || a.status === filter) &&
        `${a.customer} ${a.serviceName} ${a.reference}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => a.start.localeCompare(b.start));
  function changeMonth(n) {
    setMonth(Temporal.PlainYearMonth.from(month).add({ months: n }).toString());
  }
  const start = `${month}-01`,
    count = Temporal.PlainDate.from(start).daysInMonth,
    offset = (weekday(start) + 6) % 7;
  return (
    <>
      <PageTitle
        eyebrow="MAKE ROOM FOR WHAT’S NEXT"
        title="Your calendar, in good hands."
        description="Every confirmed appointment, all in one place."
        action={
          <button className="button" onClick={() => setManual(true)}>
            <Plus size={17} /> New appointment
          </button>
        }
      />
      <div className="appointments-summary">
        <span>
          <i className="status-dot" />
          {
            data.appointments.filter((a) => a.status === "confirmed").length
          }{" "}
          confirmed
        </span>
        <span>
          {data.appointments.filter((a) => a.status === "cancelled").length}{" "}
          cancelled
        </span>
        <span>Timezone: {data.config.timezone}</span>
      </div>
      <section className="panel">
        <div className="filter-bar">
          <div className="search-input">
            <Search size={17} />
            <input
              placeholder="Search appointments…"
              aria-label="Search appointments"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Appointment status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="segmented">
            <button
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
            >
              <List size={16} /> List
            </button>
            <button
              className={view === "calendar" ? "active" : ""}
              onClick={() => setView("calendar")}
            >
              <CalendarDays size={16} /> Calendar
            </button>
          </div>
        </div>
        {view === "list" ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Date & time</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.customer}</strong>
                      <small className="cell-sub">
                        {a.reference} {a.sample && "· Sample"}
                      </small>
                    </td>
                    <td>{a.serviceName}</td>
                    <td>{formatSlot(a.start, data.config.timezone)}</td>
                    <td>
                      <Badge type={a.status === "confirmed" ? "green" : "red"}>
                        {a.status}
                      </Badge>
                    </td>
                    <td>
                      <button
                        className="text-link"
                        aria-label={`Details for ${a.customer}`}
                        onClick={() => setParams({ booking: a.id })}
                      >
                        Details <ArrowUpRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length && (
              <Empty icon={CalendarDays} title="Nothing on the calendar yet">
                Try a different search, make a manual booking, or talk to your
                receptionist.
              </Empty>
            )}
          </div>
        ) : (
          <div
            className="calendar"
            tabIndex={0}
            role="region"
            aria-label="Appointment calendar"
          >
            <div className="calendar-toolbar">
              <h2>
                {new Intl.DateTimeFormat("en-GB", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(new Date(`${month}-01T12:00Z`))}
              </h2>
              <div>
                <button
                  className="icon-button"
                  aria-label="Previous month"
                  onClick={() => changeMonth(-1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="button secondary small"
                  onClick={() =>
                    setMonth(today(data.config.timezone).slice(0, 7))
                  }
                >
                  Today
                </button>
                <button
                  className="icon-button"
                  aria-label="Next month"
                  onClick={() => changeMonth(1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="calendar-grid">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div className="weekday" key={day}>
                  {day}
                </div>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <div className="calendar-cell blank" key={`blank-${i}`} />
              ))}
              {Array.from({ length: count }, (_, i) => {
                const date = addDays(start, i);
                return (
                  <div
                    className={`calendar-cell ${date === today(data.config.timezone) ? "today" : ""}`}
                    key={date}
                  >
                    <span className="day-number">{i + 1}</span>
                    {list
                      .filter(
                        (a) =>
                          new Intl.DateTimeFormat("en-CA", {
                            timeZone: data.config.timezone,
                          }).format(new Date(a.start)) === date,
                      )
                      .map((a) => (
                        <button
                          className={`calendar-booking ${a.status}`}
                          key={a.id}
                          onClick={() => setParams({ booking: a.id })}
                        >
                          <strong>
                            {new Intl.DateTimeFormat("en-GB", {
                              timeZone: data.config.timezone,
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(a.start))}
                          </strong>{" "}
                          {a.customer}
                        </button>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="panel-foot">
          {list.length} appointment{list.length !== 1 ? "s" : ""} · Changes are
          saved to your {data ? "workspace" : "browser"}.
        </div>
      </section>
      {selected && (
        <BookingDetails appointment={selected} onClose={() => setParams({})} />
      )}{" "}
      {manual && (
        <ManualBooking
          onClose={() => setManual(false)}
          onBooked={(a) => {
            setManual(false);
            setParams({ booking: a.id });
          }}
        />
      )}
      <p className="data-note">
        A slot is reserved only after confirmation. Cancelled bookings stay in
        history and release their slot.
      </p>
    </>
  );
}
function ManualBooking({ onClose, onBooked }) {
  const { data, perform } = useApp(),
    [form, setForm] = useState({
      customer: "",
      phone: "",
      serviceId: data.config.services[0].id,
      date: today(data.config.timezone),
      time: "10:00",
    }),
    [review, setReview] = useState(false),
    [error, setError] = useState(""),
    [suggestions, setSuggestions] = useState([]),
    [busy, setBusy] = useState(false),
    [key] = useState(() => crypto.randomUUID());
  const field = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setReview(false);
    setError("");
  };
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!review) {
      try {
        validateBooking(data, form);
        setReview(true);
        setSuggestions([]);
      } catch (err) {
        setError(err.message);
        setSuggestions(alternatives(data, form));
      }
      return;
    }
    setBusy(true);
    try {
      const a = await perform(
        (r) => r.book({ ...form, idempotencyKey: key }),
        "Appointment saved and confirmation preview created.",
      );
      onBooked(a);
    } catch (err) {
      setError(err.message);
      setReview(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="New appointment" onClose={onClose}>
      <form onSubmit={submit} className="modal-form">
        <div className="form-grid">
          <Field label="Customer name">
            <input
              autoFocus
              required
              minLength={2}
              maxLength={80}
              value={form.customer}
              onChange={(e) => field("customer", e.target.value)}
            />
          </Field>
          <Field label="Phone (optional)">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => field("phone", e.target.value)}
            />
          </Field>
          <Field label="Service">
            <select
              value={form.serviceId}
              onChange={(e) => field("serviceId", e.target.value)}
            >
              {data.config.services.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name} · {s.duration} min
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Date (${data.config.timezone})`}>
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => field("date", e.target.value)}
            />
          </Field>
          <Field label="Time">
            <input
              required
              type="time"
              value={form.time}
              onChange={(e) => field("time", e.target.value)}
            />
          </Field>
        </div>
        {error && (
          <p role="alert" className="inline-error">
            {error}
          </p>
        )}
        {suggestions.length > 0 && (
          <div className="slot-suggestions">
            <p>Available alternatives</p>
            {suggestions.map((s) => (
              <button
                type="button"
                className="button secondary small"
                key={s.start}
                onClick={() => {
                  setForm({ ...form, date: s.date, time: s.time });
                  setReview(false);
                  setError("");
                  setSuggestions([]);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        {review && (
          <div className="notice proposal">
            <span>
              Review:{" "}
              {data.config.services.find((s) => s.id === form.serviceId).name}{" "}
              for <strong>{form.customer}</strong> on {form.date} at {form.time}{" "}
              ({data.config.timezone}). Confirm to save.
            </span>
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Back
          </button>
          <button className="button" disabled={busy}>
            {busy
              ? "Saving…"
              : review
                ? "Confirm appointment"
                : "Check availability"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
