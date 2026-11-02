import { validateBooking, alternatives, bookInState, cancelInState } from "./booking";
import { formatSlot, localParts } from "./time";

/**
 * Checks appointment availability for a specific service, date, and time.
 * If unavailable, returns nearest valid slot alternatives.
 */
export function checkAvailability(state, { serviceId, date, time, customer }, now = new Date()) {
  const service = state.config.services.find((s) => s.id === serviceId);
  if (!service) {
    return {
      available: false,
      code: "service_not_found",
      message: `Service with ID '${serviceId}' not found. Available services: ${state.config.services.map((s) => s.name).join(", ")}.`,
      alternatives: [],
    };
  }

  try {
    const { start, end } = validateBooking(
      state,
      {
        customer: customer || "Guest Customer",
        serviceId,
        date,
        time,
      },
      now,
    );

    return {
      available: true,
      serviceId,
      serviceName: service.name,
      duration: service.duration || state.config.duration,
      price: service.price,
      date,
      time,
      start,
      end,
      formattedSlot: formatSlot(start, state.config.timezone),
      timezone: state.config.timezone,
      message: `Yes, ${service.name} is available on ${date} at ${time} (${state.config.timezone}).`,
      alternatives: [],
    };
  } catch (error) {
    const altSlots = alternatives(
      state,
      { serviceId, date, time, customer: customer || "Guest Customer" },
      now,
      3,
    );

    return {
      available: false,
      code: error.code || "slot_unavailable",
      message: error.message,
      alternatives: altSlots,
      suggestedMessage: altSlots.length
        ? `That slot is unavailable (${error.message}). The closest available slots are: ${altSlots.map((a, i) => `Option ${i + 1}: ${a.label}`).join(", ")}.`
        : `That slot is unavailable (${error.message}), and no nearby slots were found in the current booking window.`,
    };
  }
}

/**
 * Creates an appointment after validation. Idempotent via idempotencyKey.
 */
export function createAppointmentAction(state, input, now = new Date()) {
  const key = input.idempotencyKey || `appt-${crypto.randomUUID().slice(0, 12)}`;
  const appointment = bookInState(
    state,
    {
      ...input,
      idempotencyKey: key,
    },
    now,
  );

  // Link or create customer record idempotently
  if (!state.customers) state.customers = [];
  let customer = state.customers.find(
    (c) =>
      (input.phone && c.phone === input.phone) ||
      (input.email && c.email && c.email.toLowerCase() === input.email.toLowerCase()) ||
      c.name.toLowerCase() === input.customer.trim().toLowerCase(),
  );

  if (!customer) {
    customer = {
      id: crypto.randomUUID(),
      businessId: state.config.id || "biz-1",
      name: input.customer.trim(),
      phone: input.phone || "",
      email: input.email || "",
      notes: `First booked ${appointment.serviceName} on ${formatSlot(appointment.start, state.config.timezone)}`,
      totalAppointments: 1,
      createdAt: now.toISOString(),
    };
    state.customers.push(customer);
  } else {
    customer.totalAppointments = (customer.totalAppointments || 0) + 1;
    if (input.phone && !customer.phone) customer.phone = input.phone;
    if (input.email && !customer.email) customer.email = input.email;
  }
  appointment.customerId = customer.id;

  // If a lead exists for this customer or conversation, mark it as converted
  if (state.leads) {
    const lead = state.leads.find(
      (l) =>
        (input.conversationId && l.conversationId === input.conversationId) ||
        (customer.id && l.customerId === customer.id) ||
        (input.phone && l.phone === input.phone),
    );
    if (lead) {
      lead.status = "converted";
      lead.appointmentId = appointment.id;
      lead.updatedAt = now.toISOString();
    }
  }

  return {
    success: true,
    appointment,
    reference: appointment.reference,
    message: `Appointment confirmed for ${appointment.customer} on ${formatSlot(appointment.start, state.config.timezone)}. Reference: ${appointment.reference}.`,
  };
}

/**
 * Creates a prospective customer lead when inquiry did not immediately result in booking.
 */
export function createLeadAction(state, input, now = new Date()) {
  if (!state.leads) state.leads = [];
  if (!state.customers) state.customers = [];

  const name = (input.name || input.customer || input.customerName || "Prospective Client").trim();
  const phone = input.phone || input.customerPhone || "";
  const email = input.email || input.customerEmail || "";

  // Link or find existing customer
  let customer = state.customers.find(
    (c) =>
      (phone && c.phone === phone) ||
      (email && c.email && c.email.toLowerCase() === email.toLowerCase()) ||
      (name !== "Prospective Client" && c.name.toLowerCase() === name.toLowerCase()),
  );

  if (!customer && (phone || email || name !== "Prospective Client")) {
    customer = {
      id: crypto.randomUUID(),
      businessId: state.config.id || "biz-1",
      name,
      phone,
      email,
      notes: input.enquiry ? `Lead enquiry: ${input.enquiry}` : "Lead created from voice assistant",
      totalAppointments: 0,
      createdAt: now.toISOString(),
    };
    state.customers.push(customer);
  }

  const id = crypto.randomUUID();
  const lead = {
    id,
    businessId: state.config.id || "biz-1",
    customerId: customer ? customer.id : null,
    name,
    phone,
    email,
    serviceRequested: input.serviceRequested || input.serviceName || "General Consultation",
    enquiry: input.enquiry || input.summary || "Customer expressed interest during conversation.",
    source: input.source || "ai_voice",
    status: input.status || "new",
    conversationId: input.conversationId || null,
    appointmentId: input.appointmentId || null,
    notes: input.notes || "Follow-up recommended.",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    sample: false,
  };

  state.leads.push(lead);

  // Link to conversation if present
  if (input.conversationId && state.conversations) {
    const conv = state.conversations.find((c) => c.id === input.conversationId);
    if (conv) {
      conv.leadId = id;
      if (conv.outcome === "inquiry") {
        conv.outcome = "lead_created";
      }
    }
  }

  return {
    success: true,
    lead,
    message: `Lead saved for ${lead.name}. Our staff will follow up.`,
  };
}

/**
 * Reschedules an existing appointment to a new date and time.
 */
export function rescheduleAppointmentAction(state, { appointmentId, newDate, newTime }, now = new Date()) {
  const appointment = state.appointments.find((a) => a.id === appointmentId);
  if (!appointment) {
    throw new Error(`Appointment with ID '${appointmentId}' not found.`);
  }

  if (appointment.status === "cancelled") {
    throw new Error("Cannot reschedule a cancelled appointment. Please book a new slot.");
  }

  // Validate the new slot
  const { start, end } = validateBooking(
    state,
    {
      customer: appointment.customer,
      phone: appointment.phone,
      serviceId: appointment.serviceId,
      date: newDate,
      time: newTime,
    },
    now,
  );

  const prevStart = appointment.start;
  appointment.start = start;
  appointment.end = end;
  appointment.rescheduledAt = now.toISOString();

  // Update confirmation
  const confirmation = state.confirmations.find((c) => c.appointmentId === appointment.id);
  if (confirmation) {
    confirmation.message = `Hi ${appointment.customer}, your ${appointment.serviceName} at ${state.config.name} has been rescheduled to ${formatSlot(start, state.config.timezone)} (${state.config.timezone}). Reference: ${appointment.reference}. ${state.config.address}. To cancel, contact ${state.config.phone}.`;
    confirmation.updatedAt = now.toISOString();
  }

  return {
    success: true,
    appointment,
    message: `Appointment ${appointment.reference} rescheduled from ${formatSlot(prevStart, state.config.timezone)} to ${formatSlot(start, state.config.timezone)}.`,
  };
}

/**
 * Cancels an existing appointment.
 */
export function cancelAppointmentAction(state, { appointmentId, reason }, now = new Date()) {
  const result = cancelInState(state, appointmentId, now);
  if (reason && result) {
    result.cancelReason = reason;
  }
  return {
    success: true,
    appointment: result,
    message: `Appointment ${result.reference} has been cancelled and the slot has been released.`,
  };
}

/**
 * Saves or updates a call summary, structured output, and transcript at end of conversation.
 */
export function saveCallSummaryAction(state, input, now = new Date()) {
  if (!state.conversations) state.conversations = [];

  const conversationId = input.conversationId || input.callId || crypto.randomUUID();
  let conv = state.conversations.find((c) => c.id === conversationId);

  if (!conv) {
    conv = {
      id: conversationId,
      businessId: state.config.id || "biz-1",
      startedAt: input.startedAt || now.toISOString(),
      endedAt: input.endedAt || now.toISOString(),
      caller: input.caller || "Anonymous Caller",
      outcome: input.outcome || "inquiry",
      summary: input.summary || "Call completed.",
      messages: input.transcript || input.messages || [],
      appointmentIds: input.appointmentIds || [],
      leadId: input.leadId || null,
      vapiCallId: input.vapiCallId || null,
      source: input.source || "vapi_voice",
      durationSeconds: input.durationSeconds || (input.endedAt && input.startedAt ? Math.round((Date.parse(input.endedAt) - Date.parse(input.startedAt)) / 1000) : 60),
      sample: false,
    };
    state.conversations.push(conv);
  } else {
    if (input.endedAt) conv.endedAt = input.endedAt;
    if (input.summary) conv.summary = input.summary;
    if (input.outcome && !conv.appointmentIds?.length) conv.outcome = input.outcome;
    if (input.caller) conv.caller = input.caller;
    if (input.vapiCallId) conv.vapiCallId = input.vapiCallId;
    if (input.durationSeconds) conv.durationSeconds = input.durationSeconds;
    if (input.transcript && Array.isArray(input.transcript)) {
      const ids = new Set(conv.messages.map((m) => m.id));
      conv.messages.push(...input.transcript.filter((m) => !ids.has(m.id)));
    }
  }

  // If structured data extracted a lead and customer did not book an appointment
  if (input.leadData && !conv.appointmentIds?.length) {
    const leadResult = createLeadAction(
      state,
      {
        ...input.leadData,
        conversationId: conv.id,
        source: conv.source,
      },
      now,
    );
    conv.leadId = leadResult.lead.id;
    conv.outcome = "lead_created";
  }

  return {
    success: true,
    conversation: conv,
  };
}
