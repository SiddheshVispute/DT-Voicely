import { Copy, CalendarDays, MessageSquare, Check, X } from "lucide-react";
import { useApp } from "../state/AppContext";
import { Badge, Modal, SectionHead } from "./ui";
import { formatSlot } from "../domain/time";
import { useState } from "react";
export default function BookingDetails({ appointment: a, onClose }) {
  const { data, perform, setError, setToast } = useApp(),
    [busy, setBusy] = useState(false),
    sms = data.confirmations.find((s) => s.appointmentId === a.id);
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
          <dt>Source</dt>
          <dd>
            {a.conversationId ? "Receptionist conversation" : "Manual booking"}
          </dd>
        </dl>
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
          {a.status === "confirmed" && (
            <button className="button danger" disabled={busy} onClick={cancel}>
              <X size={16} />
              {busy ? "Cancelling…" : "Cancel appointment"}
            </button>
          )}
          <button className="button secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
