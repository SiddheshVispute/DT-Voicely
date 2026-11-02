import { defaultConfig, validateConfig, greetingFor } from "../domain/config";
import { bookInState, cancelInState } from "../domain/booking";
import { today, addDays, weekday, toInstant } from "../domain/time";
import {
  checkAvailability,
  createAppointmentAction,
  createLeadAction,
  rescheduleAppointmentAction,
  cancelAppointmentAction,
  saveCallSummaryAction,
} from "../domain/actions";

export const STORAGE_KEY = "voicely.demo.v1";

export function initialState(now = new Date()) {
  const config = structuredClone(defaultConfig);
  config.id = "biz-willow-wellness";
  let date = addDays(today(config.timezone, now), 1);
  while (!config.hours[weekday(date)].open) date = addDays(date, 1);

  const state = {
    version: 1,
    revision: 0,
    config,
    appointments: [],
    conversations: [],
    confirmations: [],
    leads: [],
    customers: [],
    members: [
      {
        id: "mem-owner",
        businessId: "biz-willow-wellness",
        name: "Dr. Aadarsh Sharma",
        email: "owner@willowwellness.com",
        role: "owner",
        avatar: "A",
      },
      {
        id: "mem-emp1",
        businessId: "biz-willow-wellness",
        name: "Priya Patel",
        email: "priya@willowwellness.com",
        role: "employee",
        avatar: "P",
      },
    ],
    businesses: [
      {
        id: "biz-willow-wellness",
        name: "Willow Wellness",
        category: "Healthcare & Wellness",
        phone: "+91 80 5550 0142",
        email: "contact@willowwellness.com",
        address: "24 Garden Lane, Bengaluru",
        timezone: "Asia/Kolkata",
        createdAt: now.toISOString(),
      },
    ],
    activeBusinessId: "biz-willow-wellness",
    businessData: {},
    currentUser: {
      id: "mem-owner",
      name: "Dr. Aadarsh Sharma",
      email: "owner@willowwellness.com",
      role: "owner",
    },
  };

  const c = {
    id: crypto.randomUUID(),
    businessId: "biz-willow-wellness",
    startedAt: now.toISOString(),
    endedAt: now.toISOString(),
    caller: "Ananya Rao",
    source: "vapi_voice",
    durationSeconds: 120,
    outcome: "booked",
    summary: "Sample booking for Ananya Rao. This record is fictional.",
    appointmentIds: [],
    leadId: null,
    sample: true,
    messages: [
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: greetingFor(config),
        at: now.toISOString(),
      },
      {
        id: crypto.randomUUID(),
        role: "customer",
        text: "What services do you offer?",
        at: now.toISOString(),
      },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "We offer consultations, therapy sessions, and follow-ups.",
        at: now.toISOString(),
      },
    ],
  };
  state.conversations.push(c);

  const a = bookInState(
    state,
    {
      customer: "Ananya Rao",
      phone: "+91 98765 43210",
      serviceId: "consultation",
      date,
      time: "11:00",
      conversationId: c.id,
      idempotencyKey: "sample-booking",
      source: "ai_voice",
    },
    now,
  );
  a.sample = true;
  a.source = "ai_voice";
  a.employeeId = "mem-emp1";
  a.employeeName = "Priya Patel";
  c.summary = "Sample booking for Ananya Rao. This record is fictional.";
  c.outcome = "booked";
  state.confirmations[0].sample = true;

  state.customers = [
    {
      id: "cust-1",
      businessId: "biz-willow-wellness",
      name: "Ananya Rao",
      phone: "+91 98765 43210",
      email: "ananya.rao@example.com",
      notes: "First booked Consultation via AI Voice Assistant.",
      totalAppointments: 1,
      createdAt: now.toISOString(),
    },
    {
      id: "cust-2",
      businessId: "biz-willow-wellness",
      name: "Rohan Gupta",
      phone: "+91 98222 11000",
      email: "rohan.g@example.com",
      notes: "Inquired about weekend therapy packages.",
      totalAppointments: 0,
      createdAt: now.toISOString(),
    },
  ];
  a.customerId = "cust-1";

  state.leads = [
    {
      id: "lead-1",
      businessId: "biz-willow-wellness",
      customerId: "cust-2",
      name: "Rohan Gupta",
      phone: "+91 98222 11000",
      email: "rohan.g@example.com",
      serviceRequested: "Therapy session",
      enquiry: "Looking for weekend couple counseling sessions and pricing details.",
      source: "ai_voice",
      status: "new",
      conversationId: null,
      appointmentId: null,
      notes: "Requested a follow-up call tomorrow morning.",
      createdAt: new Date(now.getTime() - 7200000).toISOString(),
      updatedAt: new Date(now.getTime() - 7200000).toISOString(),
      sample: true,
    },
    {
      id: "lead-2",
      businessId: "biz-willow-wellness",
      customerId: null,
      name: "Sneha Verma",
      phone: "+91 97111 88223",
      email: "sneha.v@example.com",
      serviceRequested: "Consultation",
      enquiry: "Asked whether the consultation fee is deductible from the full therapy package.",
      source: "website_widget",
      status: "contacted",
      conversationId: null,
      appointmentId: null,
      notes: "Sent clinic pricing brochure via email.",
      createdAt: new Date(now.getTime() - 86400000).toISOString(),
      updatedAt: new Date(now.getTime() - 86400000).toISOString(),
      sample: true,
    },
  ];

  return state;
}

export function validState(s) {
  if (
    s?.version !== 1 ||
    !Number.isInteger(s.revision) ||
    !Array.isArray(s.appointments) ||
    !Array.isArray(s.conversations) ||
    !Array.isArray(s.confirmations)
  )
    return false;
  try {
    validateConfig(s.config);
  } catch {
    return false;
  }

  // Ensure collections exist on older states
  if (!Array.isArray(s.leads)) s.leads = [];
  if (!Array.isArray(s.customers)) s.customers = [];
  if (!Array.isArray(s.members)) s.members = [];
  if (!Array.isArray(s.businesses)) s.businesses = [];
  if (!s.activeBusinessId) s.activeBusinessId = s.config.id || "biz-1";
  if (!s.businessData) s.businessData = {};
  if (!s.currentUser) {
    s.currentUser = {
      id: "mem-owner",
      name: "Business Owner",
      role: "owner",
    };
  }

  const date = (value) =>
    typeof value === "string" && Number.isFinite(Date.parse(value));
  return (
    s.appointments.every(
      (a) =>
        a?.id &&
        typeof a.customer === "string" &&
        ["confirmed", "cancelled"].includes(a.status) &&
        date(a.start) &&
        date(a.end) &&
        Date.parse(a.end) > Date.parse(a.start) &&
        (!a.conversationId ||
          s.conversations.some((c) => c.id === a.conversationId)),
    ) &&
    s.conversations.every(
      (c) =>
        c?.id &&
        date(c.startedAt) &&
        (!c.endedAt || date(c.endedAt)) &&
        typeof c.summary === "string" &&
        Array.isArray(c.messages) &&
        Array.isArray(c.appointmentIds) &&
        c.messages.every(
          (m) =>
            m.id &&
            typeof m.text === "string" &&
            ["customer", "assistant"].includes(m.role) &&
            date(m.at),
        ),
    ) &&
    s.confirmations.every(
      (m) =>
        m?.id &&
        typeof m.message === "string" &&
        date(m.createdAt) &&
        s.appointments.some((a) => a.id === m.appointmentId),
    )
  );
}

export function createLocalRepository(
  storage = globalThis.localStorage,
  locks = globalThis.navigator?.locks,
) {
  let queue = Promise.resolve(),
    notice = "";

  const read = () => {
    let raw;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      throw new Error(
        "Browser storage is unavailable. Allow site storage to use persistent Demo Mode.",
      );
    }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (validState(parsed)) return parsed;
      } catch {
        /* Recover only malformed demo data. */
      }
      try {
        storage.setItem(`${STORAGE_KEY}.recovery.${Date.now()}`, raw);
      } catch {
        throw new Error(
          "Demo data is damaged and could not be backed up. Free some browser storage and reload.",
        );
      }
      notice =
        "Invalid demo storage was backed up and replaced with fresh sample data.";
    }
    const s = initialState();
    write(s);
    return s;
  };

  const write = (s) => {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      throw new Error(
        "Could not save: browser storage is full or blocked. No success has been recorded.",
      );
    }
  };

  const mutate = (fn) => {
    const run = async () => {
      const s = read();
      const result = fn(s);
      s.revision++;
      write(s);
      return structuredClone(result);
    };
    if (locks?.request) return locks.request(STORAGE_KEY, run);
    const result = queue.then(run);
    queue = result.catch(() => {});
    return result;
  };

  return {
    mode: "demo",
    get notice() {
      return notice;
    },
    getSnapshot: async () => structuredClone(read()),
    saveConfig: (c) =>
      mutate((s) => {
        s.config = structuredClone(validateConfig(c));
        // Sync to businesses array if present
        if (s.businesses && s.activeBusinessId) {
          const b = s.businesses.find((x) => x.id === s.activeBusinessId);
          if (b) {
            b.name = s.config.name;
            b.category = s.config.category;
            b.phone = s.config.phone;
            b.email = s.config.email;
            b.address = s.config.address;
            b.timezone = s.config.timezone;
          }
        }
        return s.config;
      }),
    startConversation: (c) =>
      mutate((s) => {
        if (s.conversations.some((x) => x.id === c.id)) return c;
        s.conversations.push(c);
        return c;
      }),
    saveConversation: (c) =>
      mutate((s) => {
        const current = s.conversations.find((x) => x.id === c.id);
        if (!current)
          throw new Error(
            "Conversation no longer exists. Start a new conversation.",
          );
        const ids = new Set(current.messages.map((m) => m.id));
        current.messages.push(...c.messages.filter((m) => !ids.has(m.id)));
        if (!current.appointmentIds.length) {
          current.outcome = c.outcome;
          current.summary = c.summary;
        }
        if (c.endedAt) current.endedAt = c.endedAt;
        if (c.leadId) current.leadId = c.leadId;
        if (c.caller) current.caller = c.caller;
        if (c.vapiCallId) current.vapiCallId = c.vapiCallId;
        if (c.durationSeconds) current.durationSeconds = c.durationSeconds;
        return current;
      }),
    book: (input) => mutate((s) => {
      const res = createAppointmentAction(s, input);
      return res.appointment;
    }),
    cancel: (id, reason) => mutate((s) => {
      const res = cancelAppointmentAction(s, { appointmentId: id, reason });
      return res.appointment;
    }),
    reschedule: (appointmentId, newDate, newTime) =>
      mutate((s) => {
        const res = rescheduleAppointmentAction(s, { appointmentId, newDate, newTime });
        return res.appointment;
      }),
    checkAvailability: (query) => {
      const s = read();
      return checkAvailability(s, query);
    },
    createLead: (input) =>
      mutate((s) => {
        const res = createLeadAction(s, input);
        return res.lead;
      }),
    updateLead: (id, updates) =>
      mutate((s) => {
        const lead = s.leads.find((l) => l.id === id);
        if (!lead) throw new Error("Lead not found.");
        Object.assign(lead, updates, { updatedAt: new Date().toISOString() });
        return lead;
      }),
    convertLeadToAppointment: (leadId, appointmentInput) =>
      mutate((s) => {
        const lead = s.leads.find((l) => l.id === leadId);
        if (!lead) throw new Error("Lead not found.");
        const res = createAppointmentAction(s, {
          ...appointmentInput,
          customer: lead.name,
          phone: lead.phone,
          email: lead.email,
        });
        lead.status = "converted";
        lead.appointmentId = res.appointment.id;
        lead.updatedAt = new Date().toISOString();
        return { lead, appointment: res.appointment };
      }),
    saveCallSummary: (summaryInput) =>
      mutate((s) => {
        const res = saveCallSummaryAction(s, summaryInput);
        return res.conversation;
      }),
    createBusiness: (businessData) =>
      mutate((s) => {
        const id = `biz-${crypto.randomUUID().slice(0, 8)}`;
        const now = new Date();
        const newConfig = structuredClone(defaultConfig);
        newConfig.id = id;
        newConfig.name = businessData.name || "New Business";
        newConfig.category = businessData.category || "General Services";
        newConfig.phone = businessData.phone || s.config.phone;
        newConfig.email = businessData.email || "hello@business.com";
        newConfig.address = businessData.address || "100 Main Street";
        newConfig.timezone = businessData.timezone || s.config.timezone;
        if (businessData.services?.length) newConfig.services = businessData.services;
        if (businessData.hours) newConfig.hours = businessData.hours;
        if (businessData.agent) newConfig.agent = { ...newConfig.agent, ...businessData.agent };
        if (businessData.vapi) newConfig.vapi = { ...newConfig.vapi, ...businessData.vapi };

        const businessRecord = {
          id,
          name: newConfig.name,
          category: newConfig.category,
          phone: newConfig.phone,
          email: newConfig.email,
          address: newConfig.address,
          timezone: newConfig.timezone,
          createdAt: now.toISOString(),
        };

        // Archive current active business data before switching
        if (!s.businessData) s.businessData = {};
        s.businessData[s.activeBusinessId] = {
          config: s.config,
          appointments: s.appointments,
          conversations: s.conversations,
          confirmations: s.confirmations,
          leads: s.leads,
          customers: s.customers,
        };

        s.businesses.push(businessRecord);
        s.activeBusinessId = id;
        s.config = validateConfig(newConfig);
        s.appointments = [];
        s.conversations = [];
        s.confirmations = [];
        s.leads = [];
        s.customers = [];

        // Add owner member for the new business
        s.members.push({
          id: `mem-${id}-owner`,
          businessId: id,
          name: s.currentUser?.name || "Business Owner",
          email: s.currentUser?.email || newConfig.email,
          role: "owner",
          avatar: newConfig.name.slice(0, 1),
        });

        return { business: businessRecord, config: s.config };
      }),
    switchBusiness: (businessId) =>
      mutate((s) => {
        if (s.activeBusinessId === businessId) return s;
        const target = s.businesses.find((b) => b.id === businessId);
        if (!target) throw new Error("Business workspace not found.");

        // Archive current workspace
        if (!s.businessData) s.businessData = {};
        s.businessData[s.activeBusinessId] = {
          config: s.config,
          appointments: s.appointments,
          conversations: s.conversations,
          confirmations: s.confirmations,
          leads: s.leads,
          customers: s.customers,
        };

        // Load target workspace or initialize
        const targetData = s.businessData[businessId] || {
          config: { ...defaultConfig, id: target.id, name: target.name, category: target.category, timezone: target.timezone },
          appointments: [],
          conversations: [],
          confirmations: [],
          leads: [],
          customers: [],
        };

        s.activeBusinessId = businessId;
        s.config = validateConfig(targetData.config);
        s.appointments = targetData.appointments;
        s.conversations = targetData.conversations;
        s.confirmations = targetData.confirmations;
        s.leads = targetData.leads;
        s.customers = targetData.customers;

        return s;
      }),
    setCurrentUserRole: (role) =>
      mutate((s) => {
        if (!["owner", "admin", "employee"].includes(role)) {
          throw new Error("Invalid role. Choose owner, admin, or employee.");
        }
        s.currentUser.role = role;
        return s.currentUser;
      }),
    addMember: (memberData) =>
      mutate((s) => {
        const id = `mem-${crypto.randomUUID().slice(0, 8)}`;
        const member = {
          id,
          businessId: s.activeBusinessId,
          name: memberData.name.trim(),
          email: memberData.email.trim(),
          role: memberData.role || "employee",
          avatar: memberData.name.trim().slice(0, 1).toUpperCase(),
          createdAt: new Date().toISOString(),
        };
        s.members.push(member);
        return member;
      }),
    reset: () =>
      mutate((s) => {
        Object.assign(s, initialState());
        return s;
      }),
  };
}
