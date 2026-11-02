import { Copy, CalendarDays, MessageSquare, Check, X, Calendar, Clock, RefreshCw } from "lucide-react";
import { useApp } from "../state/AppContext";
import { Badge, Modal, SectionHead, Field } from "./ui";
import { formatSlot, today, localParts } from "../domain/time";
import { useState } from "react";

export default function BookingDetails({ appointment: a, onClose }) {
  const { data, perform, setError, setToast, rescheduleAppointment } = useApp();
  const [busy, setBusy] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  const parts = localParts(a.start, data.config.timezone);
  const [newDate, setNewDate] = useState(parts.date);
  const [newTime, setNewTime] = useState(parts.time);

  const sms = data.confirmations.find((s) => s.appointmentId === a.id);

  async function cancel() {
    if (
      !window.confirm(
        `Cancel ${a.reference} for ${a.customer}? This will release the time slot.`,
      )
    )
      return;
    setBusy(true);
    try {
      await perform(
        (r) => r.cancel(a.id),
        "Appointment cancelled. The slot is available again.",
      );
    } catch {
    } finally {
      setBusy(false);
    }
  }

  async function handleReschedule(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await rescheduleAppointment(a.id, newDate, newTime);
      setRescheduling(false);
      setToast(`Rescheduled to ${newDate} at ${newTime}!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(sms.message);
      setToast("Confirmation copied.");
    } catch {
      setError(
        "Clipboard access was denied. Select the preview text and copy it manually.",
      );
    }
  }

  const getSourceLabel = (src) => {
    switch (src) {
      case "ai_voice":
        return <Badge type="purple">AI Voice Assistant</Badge>;
      case "website_widget":
        return <Badge type="blue">Website Widget</Badge>;
      default:
        return <Badge type="neutral">Manual Entry</Badge>;
    }
  };

  return (
    <Modal title="Appointment details" onClose={onClose}>
      <div className="booking-detail">
        <div className="detail-title">
          <span className="table-icon">
            <CalendarDays size={24} />
          </span>
          <div>
            <h3>{a.customer}</h3>
            <p>
              {a.reference} {a.sample ? "· Sample data" : ""}
            </p>
          </div>
          <Badge type={a.status === "confirmed" ? "green" : "red"}>
            {a.status}
          </Badge>
        </div>

        <dl>
          <dt>Service</dt>
          <dd>{a.serviceName}</dd>
          <dt>When</dt>
          <dd>{formatSlot(a.start, data.config.timezone)}</dd>
          <dt>Timezone</dt>
          <dd>{data.config.timezone}</dd>
          <dt>Duration</dt>
          <dd>{(Date.parse(a.end) - Date.parse(a.start)) / 60000} minutes</dd>
          <dt>Phone</dt>
          <dd>{a.phone || "Not provided"}</dd>
          <dt>Assigned Staff</dt>
          <dd>{a.employeeName || data.config.name + " Team"}</dd>
          <dt>Booking Source</dt>
          <dd>{getSourceLabel(a.source || (a.conversationId ? "ai_voice" : "manual"))}</dd>
        </dl>

        {/* Reschedule Form */}
        {rescheduling && (
          <form className="reschedule-box" onSubmit={handleReschedule}>
            <h4>
              <RefreshCw size={16} /> Choose New Date & Time
            </h4>
            <div className="field-row">
              <Field label="New Date">
                <input
                  type="date"
                  min={today(data.config.timezone)}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="New Time">
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="button secondary small"
                onClick={() => setRescheduling(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button small" disabled={busy}>
                Confirm Reschedule
              </button>
            </div>
          </form>
        )}

        {sms && (
          <div className="sms-preview">
            <SectionHead title="Confirmation preview">
              <MessageSquare size={18} />
            </SectionHead>
            <Badge type="amber">Simulated — Not Sent</Badge>
            {a.status === "cancelled" && (
              <p className="error-text">
                Historical confirmation. This appointment is now cancelled.
              </p>
            )}
            <p className="sms-recipient">To: {sms.recipient}</p>
            <blockquote>{sms.message}</blockquote>
            <div className="sms-footer">
              <small>{new Date(sms.createdAt).toLocaleString()}</small>
              <button className="button secondary small" onClick={copy}>
                <Copy size={14} /> Copy message
              </button>
            </div>
          </div>
        )}

        <div className="modal-actions">
          {a.status === "confirmed" && !rescheduling && (
            <>
              <button
                className="button secondary"
                onClick={() => setRescheduling(true)}
              >
                <Calendar size={16} /> Reschedule
              </button>
              <button
                className="button danger"
                disabled={busy}
                onClick={cancel}
              >
                <X size={16} />
                {busy ? "Cancelling…" : "Cancel appointment"}
              </button>
            </>
          )}
          <button className="button secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
