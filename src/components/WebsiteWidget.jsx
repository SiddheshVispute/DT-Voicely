import { useState, useRef, useEffect } from "react";
import {
  AudioLines,
  MessageSquare,
  Calendar,
  X,
  Send,
  Phone,
  Sparkles,
  ChevronDown,
  Clock,
  CheckCircle,
} from "lucide-react";
import { formatSlot, today } from "../domain/time";
import { checkAvailability, createAppointmentAction, createLeadAction } from "../domain/actions";

export default function WebsiteWidget({ config, state, onAction, previewOnly = false }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("chat"); // 'chat' | 'book' | 'lead'
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: config.widget?.welcomeMessage || `Hello! Welcome to ${config.name}. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [bookingForm, setBookingForm] = useState({
    customer: "",
    phone: "",
    email: "",
    serviceId: config.services[0]?.id || "",
    date: today(config.timezone),
    time: "11:00",
  });
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    enquiry: "",
  });
  const [leadSuccess, setLeadSuccess] = useState(null);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const themeColor = config.widget?.themeColor || "#6254e8";

  function handleSendText(e) {
    e?.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setInput("");

    const newMsgs = [
      ...messages,
      { id: crypto.randomUUID(), role: "customer", text: userText },
    ];
    setMessages(newMsgs);

    // Contextual responses based on business services and FAQs
    setTimeout(() => {
      let reply = `Thank you for your message! Our receptionist ${config.agent.name} is available to assist.`;
      const lower = userText.toLowerCase();

      if (lower.includes("price") || lower.includes("service") || lower.includes("cost")) {
        reply = `We offer: ${config.services.map((s) => `${s.name} (₹${s.price}, ${s.duration} mins)`).join(", ")}. Would you like to schedule an appointment?`;
      } else if (lower.includes("hour") || lower.includes("open") || lower.includes("time")) {
        reply = `We are open Monday–Saturday from 9:00 AM to 6:00 PM (${config.timezone}).`;
      } else if (lower.includes("where") || lower.includes("location") || lower.includes("address")) {
        reply = `We are located at ${config.address}. Free parking is available for our clients.`;
      } else if (lower.includes("book") || lower.includes("appointment")) {
        reply = `You can book directly using the 'Book' tab above, or tell me your preferred date and time!`;
        setTab("book");
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: reply },
      ]);
    }, 400);
  }

  async function handleBookSubmit(e) {
    e.preventDefault();
    try {
      if (onAction) {
        const result = await onAction("book", {
          ...bookingForm,
          source: "website_widget",
        });
        setBookingSuccess(result);
      }
    } catch (err) {
      alert(`Booking failed: ${err.message}`);
    }
  }

  async function handleLeadSubmit(e) {
    e.preventDefault();
    try {
      if (onAction) {
        const result = await onAction("lead", {
          ...leadForm,
          serviceRequested: config.services[0]?.name,
          source: "website_widget",
        });
        setLeadSuccess(result);
      }
    } catch (err) {
      alert(`Could not save enquiry: ${err.message}`);
    }
  }

  return (
    <div className={`voicely-widget-container ${previewOnly ? "is-preview" : ""}`}>
      {/* Floating Launcher Button */}
      {!open && (
        <button
          className="voicely-widget-launcher"
          style={{ backgroundColor: themeColor }}
          onClick={() => setOpen(true)}
          aria-label="Open assistant"
        >
          <AudioLines size={22} color="#fff" />
          <span>Talk to {config.agent.name}</span>
        </button>
      )}

      {/* Expanded Widget Window */}
      {open && (
        <div className="voicely-widget-window">
          {/* Widget Header */}
          <div className="widget-header" style={{ backgroundColor: themeColor }}>
            <div className="widget-header-brand">
              <span className="widget-avatar">
                <AudioLines size={18} />
              </span>
              <div>
                <strong>{config.agent.name}</strong>
                <small>{config.name} · Online</small>
              </div>
            </div>
            <button
              className="widget-close-btn"
              onClick={() => setOpen(false)}
              aria-label="Close widget"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="widget-tabs">
            <button
              className={tab === "chat" ? "active" : ""}
              onClick={() => setTab("chat")}
            >
              <MessageSquare size={14} /> Chat & Help
            </button>
            <button
              className={tab === "book" ? "active" : ""}
              onClick={() => {
                setTab("book");
                setBookingSuccess(null);
              }}
            >
              <Calendar size={14} /> Book Slot
            </button>
            <button
              className={tab === "lead" ? "active" : ""}
              onClick={() => {
                setTab("lead");
                setLeadSuccess(null);
              }}
            >
              <Sparkles size={14} /> Ask Question
            </button>
          </div>

          {/* Tab 1: Chat */}
          {tab === "chat" && (
            <div className="widget-chat-pane">
              <div className="widget-messages" ref={chatScrollRef}>
                {messages.map((m) => (
                  <div key={m.id} className={`widget-bubble ${m.role}`}>
                    <small>{m.role === "assistant" ? config.agent.name : "You"}</small>
                    <p>{m.text}</p>
                  </div>
                ))}
              </div>

              <div className="widget-quick-prompts">
                <button
                  type="button"
                  onClick={() => {
                    setInput("What services do you offer?");
                  }}
                >
                  Services & Pricing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInput("What are your opening hours?");
                  }}
                >
                  Opening Hours
                </button>
              </div>

              <form className="widget-input-bar" onSubmit={handleSendText}>
                <input
                  placeholder="Ask a question or request a time…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit" aria-label="Send message" style={{ color: themeColor }}>
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Book Appointment */}
          {tab === "book" && (
            <div className="widget-form-pane">
              {bookingSuccess ? (
                <div className="widget-success-box">
                  <CheckCircle size={36} color="var(--green)" />
                  <h4>Appointment Confirmed!</h4>
                  <p>
                    Reference: <strong>{bookingSuccess.reference || "VC-CONFIRMED"}</strong>
                  </p>
                  <small>
                    We have recorded your booking for {bookingSuccess.customer}. Confirmation details have been prepared.
                  </small>
                  <button
                    className="button secondary small"
                    onClick={() => {
                      setBookingSuccess(null);
                      setTab("chat");
                    }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form className="widget-form" onSubmit={handleBookSubmit}>
                  <h4>Book an Appointment</h4>
                  <label>
                    <span>Full Name *</span>
                    <input
                      required
                      placeholder="Your name"
                      value={bookingForm.customer}
                      onChange={(e) =>
                        setBookingForm((b) => ({ ...b, customer: e.target.value }))
                      }
                    />
                  </label>

                  <label>
                    <span>Phone Number</span>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={bookingForm.phone}
                      onChange={(e) =>
                        setBookingForm((b) => ({ ...b, phone: e.target.value }))
                      }
                    />
                  </label>

                  <label>
                    <span>Select Service</span>
                    <select
                      value={bookingForm.serviceId}
                      onChange={(e) =>
                        setBookingForm((b) => ({ ...b, serviceId: e.target.value }))
                      }
                    >
                      {config.services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.duration}m · ₹{s.price})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="widget-date-row">
                    <label>
                      <span>Date</span>
                      <input
                        type="date"
                        min={today(config.timezone)}
                        value={bookingForm.date}
                        onChange={(e) =>
                          setBookingForm((b) => ({ ...b, date: e.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span>Time</span>
                      <input
                        type="time"
                        value={bookingForm.time}
                        onChange={(e) =>
                          setBookingForm((b) => ({ ...b, time: e.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="button full"
                    style={{ backgroundColor: themeColor }}
                  >
                    Confirm Booking
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Tab 3: Leave Lead / Inquiry */}
          {tab === "lead" && (
            <div className="widget-form-pane">
              {leadSuccess ? (
                <div className="widget-success-box">
                  <CheckCircle size={36} color="var(--green)" />
                  <h4>Inquiry Received</h4>
                  <p>Thank you, {leadSuccess.name || "Customer"}!</p>
                  <small>Our team has received your inquiry and will contact you shortly.</small>
                  <button
                    className="button secondary small"
                    onClick={() => {
                      setLeadSuccess(null);
                      setTab("chat");
                    }}
                  >
                    Return to chat
                  </button>
                </div>
              ) : (
                <form className="widget-form" onSubmit={handleLeadSubmit}>
                  <h4>Leave an Inquiry</h4>
                  <label>
                    <span>Your Name *</span>
                    <input
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={leadForm.name}
                      onChange={(e) => setLeadForm((l) => ({ ...l, name: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Phone or Email *</span>
                    <input
                      required
                      placeholder="+91 ... or email@example.com"
                      value={leadForm.phone}
                      onChange={(e) => setLeadForm((l) => ({ ...l, phone: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>What can we help you with?</span>
                    <textarea
                      rows={3}
                      required
                      placeholder="Ask about availability, pricing, or custom requests…"
                      value={leadForm.enquiry}
                      onChange={(e) => setLeadForm((l) => ({ ...l, enquiry: e.target.value }))}
                    />
                  </label>
                  <button
                    type="submit"
                    className="button full"
                    style={{ backgroundColor: themeColor }}
                  >
                    Send to Team
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
