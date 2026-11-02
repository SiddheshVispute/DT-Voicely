import { useState } from "react";
import { Link } from "react-router-dom";
import {
  UserCheck,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  CalendarDays,
  Tag,
  MessageSquare,
} from "lucide-react";
import { useApp } from "../state/AppContext";
import { PageTitle, Badge, Modal, Field, Empty } from "../components/ui";
import { formatDate, today } from "../domain/time";

export default function Leads() {
  const { data, createLead, updateLead, convertLeadToAppointment, active } = useApp();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [newLeadModal, setNewLeadModal] = useState(false);
  const [convertModal, setConvertModal] = useState(null);

  // Form states
  const [newLead, setNewLead] = useState({
    name: "",
    phone: "",
    email: "",
    serviceRequested: data.config.services[0]?.name || "Consultation",
    enquiry: "",
    source: "manual",
    notes: "",
  });

  const [convertForm, setConvertForm] = useState({
    serviceId: data.config.services[0]?.id || "",
    date: today(data.config.timezone),
    time: "10:00",
  });

  const leads = data.leads || [];

  const filteredLeads = leads
    .filter((l) => {
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const matchesSource = sourceFilter === "all" || l.source === sourceFilter;
      const text = `${l.name} ${l.phone} ${l.email} ${l.serviceRequested} ${l.enquiry}`.toLowerCase();
      const matchesQuery = text.includes(query.toLowerCase());
      return matchesStatus && matchesSource && matchesQuery;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    converted: leads.filter((l) => l.status === "converted").length,
    lost: leads.filter((l) => l.status === "lost").length,
  };

  const conversionRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;

  async function handleCreateLead(e) {
    e.preventDefault();
    if (!newLead.name.trim()) return;
    await createLead(newLead);
    setNewLeadModal(false);
    setNewLead({
      name: "",
      phone: "",
      email: "",
      serviceRequested: data.config.services[0]?.name || "Consultation",
      enquiry: "",
      source: "manual",
      notes: "",
    });
  }

  async function handleStatusChange(leadId, newStatus) {
    await updateLead(leadId, { status: newStatus });
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) => ({ ...prev, status: newStatus }));
    }
  }

  async function handleAddNote(leadId, noteText) {
    if (!noteText.trim()) return;
    const existing = selectedLead.notes || "";
    const updated = existing
      ? `${existing}\n• [${new Date().toLocaleDateString()}]: ${noteText.trim()}`
      : `• [${new Date().toLocaleDateString()}]: ${noteText.trim()}`;
    await updateLead(leadId, { notes: updated });
    setSelectedLead((prev) => ({ ...prev, notes: updated }));
  }

  async function handleConvertLead(e) {
    e.preventDefault();
    if (!convertModal) return;

    await convertLeadToAppointment(convertModal.id, {
      serviceId: convertForm.serviceId,
      date: convertForm.date,
      time: convertForm.time,
      idempotencyKey: `lead-convert-${convertModal.id}-${Date.now()}`,
    });

    setConvertModal(null);
    setSelectedLead(null);
  }

  const getSourceBadge = (source) => {
    switch (source) {
      case "ai_voice":
        return <Badge type="purple">AI Voice</Badge>;
      case "website_widget":
        return <Badge type="blue">Website Widget</Badge>;
      case "phone":
        return <Badge type="neutral">Phone</Badge>;
      default:
        return <Badge type="neutral">Manual</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "new":
        return <Badge type="blue">New</Badge>;
      case "contacted":
        return <Badge type="amber">Contacted</Badge>;
      case "converted":
        return <Badge type="green">Converted</Badge>;
      case "lost":
        return <Badge type="neutral">Lost</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      <PageTitle
        eyebrow="FROM CONVERSATIONS TO CUSTOMERS"
        title="Prospective client leads."
        description="Every customer inquiry, captured automatically from voice calls, website widgets, and staff notes."
        action={
          <button className="button" onClick={() => setNewLeadModal(true)}>
            <Plus size={17} /> Add new lead
          </button>
        }
      />

      {/* Metrics Row */}
      <div className="stats-grid leads-stats-grid">
        <div className="stat-card">
          <div className="stat-top">
            <span>Total Leads</span>
            <UserCheck size={18} />
          </div>
          <strong>{stats.total}</strong>
          <small>Captured in workspace</small>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>New Inquiries</span>
            <Clock size={18} />
          </div>
          <strong style={{ color: "var(--primary)" }}>{stats.new}</strong>
          <small>Awaiting staff follow-up</small>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>In Contact</span>
            <Phone size={18} />
          </div>
          <strong>{stats.contacted}</strong>
          <small>Discussions in progress</small>
        </div>
        <div className="stat-card">
          <div className="stat-top">
            <span>Converted</span>
            <CheckCircle2 size={18} />
          </div>
          <strong style={{ color: "var(--green)" }}>{stats.converted}</strong>
          <small>{conversionRate}% conversion rate</small>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <section className="panel">
        <div className="filter-bar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Search leads"
              placeholder="Search by name, phone, email, or service…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>

          <select
            aria-label="Filter by source"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">All sources</option>
            <option value="ai_voice">AI Voice Assistant</option>
            <option value="website_widget">Website Widget</option>
            <option value="manual">Manual Entry</option>
          </select>
        </div>

        {/* Leads Table */}
        <div className="leads-table-container">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Service Requested</th>
                <th>Enquiry Summary</th>
                <th>Source</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="lead-row">
                  <td>
                    <div className="lead-customer-cell">
                      <span className="customer-avatar">{lead.name.slice(0, 1)}</span>
                      <div>
                        <strong>{lead.name}</strong>
                        {lead.sample && <small className="sample-tag">Sample</small>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="lead-contact-cell">
                      {lead.phone ? (
                        <a href={`tel:${lead.phone}`} className="contact-link">
                          <Phone size={13} /> {lead.phone}
                        </a>
                      ) : (
                        <span className="text-muted">No phone</span>
                      )}
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} className="contact-link">
                          <Mail size={13} /> {lead.email}
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="service-tag">{lead.serviceRequested}</span>
                  </td>
                  <td>
                    <p className="enquiry-preview">{lead.enquiry}</p>
                  </td>
                  <td>{getSourceBadge(lead.source)}</td>
                  <td>{getStatusBadge(lead.status)}</td>
                  <td>
                    <span className="date-cell">
                      {formatDate(lead.createdAt, data.config.timezone, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </td>
                  <td>
                    <button
                      className="button secondary small"
                      onClick={() => setSelectedLead(lead)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLeads.length === 0 && (
            <Empty
              icon={UserCheck}
              title="No leads found"
              children={
                query || statusFilter !== "all" || sourceFilter !== "all"
                  ? "Try adjusting your filters or search query."
                  : "Prospective customer inquiries will appear here automatically when they chat or call."
              }
            />
          )}
        </div>
      </section>

      {/* Lead Details Modal */}
      {selectedLead && (
        <Modal
          title={`Lead Details · ${selectedLead.name}`}
          onClose={() => setSelectedLead(null)}
        >
          <div className="lead-details-content">
            <div className="lead-details-header">
              <div className="lead-profile">
                <span className="lead-large-avatar">{selectedLead.name.slice(0, 1)}</span>
                <div>
                  <h3>{selectedLead.name}</h3>
                  <div className="lead-meta">
                    {getSourceBadge(selectedLead.source)}
                    {getStatusBadge(selectedLead.status)}
                    <small>
                      Created {formatDate(selectedLead.createdAt, data.config.timezone, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </div>
                </div>
              </div>

              {selectedLead.status !== "converted" && (
                <button
                  className="button"
                  onClick={() => {
                    setConvertModal(selectedLead);
                    const matchingService = data.config.services.find(
                      (s) => s.name.toLowerCase() === selectedLead.serviceRequested?.toLowerCase(),
                    );
                    setConvertForm({
                      serviceId: matchingService?.id || data.config.services[0]?.id || "",
                      date: today(data.config.timezone),
                      time: "10:00",
                    });
                  }}
                >
                  <CalendarDays size={16} /> Convert to Appointment
                </button>
              )}
            </div>

            <div className="lead-info-grid">
              <div className="info-block">
                <span>Phone</span>
                <strong>{selectedLead.phone || "Not provided"}</strong>
              </div>
              <div className="info-block">
                <span>Email</span>
                <strong>{selectedLead.email || "Not provided"}</strong>
              </div>
              <div className="info-block">
                <span>Requested Service</span>
                <strong>{selectedLead.serviceRequested}</strong>
              </div>
              <div className="info-block">
                <span>Change Status</span>
                <select
                  value={selectedLead.status}
                  onChange={(e) => handleStatusChange(selectedLead.id, e.target.value)}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="converted">Converted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            </div>

            <div className="enquiry-full-box">
              <h4>Customer Enquiry / Interest</h4>
              <p>{selectedLead.enquiry}</p>
            </div>

            {selectedLead.appointmentId && (
              <div className="notice success">
                <CheckCircle2 size={16} />
                <span>
                  Converted to appointment!{" "}
                  <Link
                    to={`/app/appointments?booking=${selectedLead.appointmentId}`}
                    onClick={() => setSelectedLead(null)}
                    className="text-link"
                  >
                    View booking in calendar →
                  </Link>
                </span>
              </div>
            )}

            <div className="lead-notes-section">
              <h4>Staff Notes & Activity</h4>
              <div className="notes-box">
                <pre>{selectedLead.notes || "No notes recorded yet."}</pre>
              </div>
              <form
                className="add-note-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.target.elements.note;
                  handleAddNote(selectedLead.id, input.value);
                  input.value = "";
                }}
              >
                <input name="note" placeholder="Add a follow-up note…" />
                <button className="button secondary" type="submit">
                  Add Note
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* Convert to Appointment Modal */}
      {convertModal && (
        <Modal
          title={`Convert Lead to Appointment · ${convertModal.name}`}
          onClose={() => setConvertModal(null)}
        >
          <form className="form-grid" onSubmit={handleConvertLead}>
            <p className="modal-description">
              Create a confirmed calendar booking for <strong>{convertModal.name}</strong> ({convertModal.phone || "No phone"}).
            </p>

            <Field label="Service">
              <select
                value={convertForm.serviceId}
                onChange={(e) => setConvertForm((f) => ({ ...f, serviceId: e.target.value }))}
                required
              >
                {data.config.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration} mins — ₹{s.price})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Appointment Date">
              <input
                type="date"
                value={convertForm.date}
                min={today(data.config.timezone)}
                onChange={(e) => setConvertForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </Field>

            <Field label="Start Time (Business Timezone)">
              <input
                type="time"
                value={convertForm.time}
                onChange={(e) => setConvertForm((f) => ({ ...f, time: e.target.value }))}
                required
              />
            </Field>

            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setConvertModal(null)}
              >
                Cancel
              </button>
              <button type="submit" className="button">
                Confirm & Convert Lead
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* New Lead Modal */}
      {newLeadModal && (
        <Modal title="Create New Lead" onClose={() => setNewLeadModal(false)}>
          <form className="form-grid" onSubmit={handleCreateLead}>
            <Field label="Customer Full Name">
              <input
                value={newLead.name}
                onChange={(e) => setNewLead((l) => ({ ...l, name: e.target.value }))}
                placeholder="e.g. Maya Sen"
                required
              />
            </Field>

            <Field label="Phone Number">
              <input
                type="tel"
                value={newLead.phone}
                onChange={(e) => setNewLead((l) => ({ ...l, phone: e.target.value }))}
                placeholder="+91 98765 43210"
              />
            </Field>

            <Field label="Email Address">
              <input
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead((l) => ({ ...l, email: e.target.value }))}
                placeholder="maya@example.com"
              />
            </Field>

            <Field label="Service of Interest">
              <select
                value={newLead.serviceRequested}
                onChange={(e) => setNewLead((l) => ({ ...l, serviceRequested: e.target.value }))}
              >
                {data.config.services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Enquiry Details / Message">
              <textarea
                value={newLead.enquiry}
                onChange={(e) => setNewLead((l) => ({ ...l, enquiry: e.target.value }))}
                placeholder="What did the customer ask about?"
                rows={3}
              />
            </Field>

            <Field label="Initial Note">
              <input
                value={newLead.notes}
                onChange={(e) => setNewLead((l) => ({ ...l, notes: e.target.value }))}
                placeholder="Follow-up preference, timing, etc."
              />
            </Field>

            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setNewLeadModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button">
                Save Lead
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
