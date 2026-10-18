import { Temporal } from "@js-temporal/polyfill";
import {
  today,
  addDays,
  weekday,
  minutes,
  toInstant,
  formatSlot,
  localParts,
} from "./time";
export class BookingError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
const reject = (code, message) => {
  throw new BookingError(code, message);
};
export function validateBooking(state, input, now = new Date()) {
  const c = state.config;
  if (!/^[\p{L}][\p{L}\p{M} .’'-]{1,79}$/u.test(input.customer?.trim() || ""))
    reject("customer", "Please provide a customer name with 2–80 letters.");
  if (input.phone && !/^\+?[\d ()-]{7,20}$/.test(input.phone))
    reject("phone", "Please provide a valid phone number or leave it blank.");
  const service = c.services.find((s) => s.id === input.serviceId);
  if (!service) reject("service", "Choose an available service.");
  let start, date;
  try {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)
    )
      throw Error();
    date = Temporal.PlainDate.from(input.date);
    start = toInstant(input.date, input.time, c.timezone);
  } catch {
    reject(
      "date",
      "Enter a valid date and time. Daylight-saving gaps or repeated times need a different slot.",
    );
  }
  const startMs = Date.parse(start),
    nowMs = now.getTime();
  if (startMs <= nowMs)
    reject(
      "past",
      "That time is in the past. Please choose a future appointment.",
    );
  if (startMs < nowMs + c.minNotice * 60000)
    reject("notice", `Please book at least ${c.minNotice} minutes ahead.`);
  if (date.toString() > addDays(today(c.timezone, now), c.advanceDays))
    reject(
      "advance",
      `Appointments can be booked up to ${c.advanceDays} days ahead.`,
    );
  const h = c.hours[weekday(input.date)];
  if (!h?.open)
    reject("closed", "We are closed on that day. Please choose an open day.");
  const duration = service.duration || c.duration;
  if (
    minutes(input.time) < minutes(h.start) ||
    minutes(input.time) + duration > minutes(h.end)
  )
    reject(
      "hours",
      `That appointment falls outside working hours (${h.start}–${h.end}).`,
    );
  const end = new Date(startMs + duration * 60000).toISOString();
  // Half-open intervals. The larger of the two buffers protects existing bookings after settings change.
  for (const a of state.appointments.filter((a) => a.status === "confirmed")) {
    const gap = Math.max(c.buffer, a.buffer || 0) * 60000;
    if (
      startMs < Date.parse(a.end) + gap &&
      Date.parse(end) + gap > Date.parse(a.start)
    )
      reject(
        "conflict",
        "That slot is already reserved or inside a booking buffer.",
      );
  }
  return { service, start, end };
}
export function alternatives(state, input, now = new Date(), limit = 3) {
  let first = input.date;
  try {
    Temporal.PlainDate.from(first);
  } catch {
    first = today(state.config.timezone, now);
  }
  if (first < today(state.config.timezone, now))
    first = today(state.config.timezone, now);
  const found = [];
  for (let day = 0; day < 14 && found.length < limit; day++) {
    const date = addDays(first, day),
      h = state.config.hours[weekday(date)];
    if (!h?.open) continue;
    for (
      let t = Math.max(
        minutes(h.start),
        day === 0 && input.time ? minutes(input.time) : 0,
      );
      t < minutes(h.end) && found.length < limit;
      t += 15
    ) {
      const time = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
      try {
        const { start } = validateBooking(
          state,
          {
            ...input,
            customer: input.customer || "Guest Customer",
            date,
            time,
          },
          now,
        );
        found.push({
          date,
          time,
          start,
          label: formatSlot(start, state.config.timezone),
        });
      } catch {
        /* Skip invalid candidate. */
      }
    }
  }
  return found;
}
export function confirmationText(a, c) {
  return `Hi ${a.customer}, your ${a.serviceName} at ${c.name} is confirmed for ${formatSlot(a.start, c.timezone)} (${c.timezone}). Reference: ${a.reference}. ${c.address}. To cancel, contact ${c.phone}.`;
}
export function bookInState(state, input, now = new Date()) {
  if (!input.idempotencyKey)
    reject("key", "A booking request identifier is required.");
  const existing = state.appointments.find(
    (a) => a.idempotencyKey === input.idempotencyKey,
  );
  if (existing) return existing;
  if (
    input.conversationId &&
    !state.conversations.some((c) => c.id === input.conversationId)
  )
    reject("conversation", "The conversation could not be found.");
  const { service, start, end } = validateBooking(state, input, now);
  const id = crypto.randomUUID();
  const a = {
    id,
    reference: `VC-${id.slice(0, 8).toUpperCase()}`,
    customer: input.customer.trim(),
    phone: input.phone || "",
    serviceId: service.id,
    serviceName: service.name,
    start,
    end,
    buffer: state.config.buffer,
    status: "confirmed",
    conversationId: input.conversationId || null,
    idempotencyKey: input.idempotencyKey,
    createdAt: now.toISOString(),
    sample: false,
  };
  state.appointments.push(a);
  state.confirmations.push({
    id: crypto.randomUUID(),
    appointmentId: a.id,
    recipient: a.phone || `${a.customer} (phone not provided)`,
    message: confirmationText(a, state.config),
    createdAt: now.toISOString(),
    status: "Simulated — Not Sent",
  });
  if (a.conversationId) {
    const c = state.conversations.find((c) => c.id === a.conversationId);
    c.appointmentIds = [...new Set([...c.appointmentIds, a.id])];
    c.outcome = "booked";
    c.summary = `${a.customer} booked ${service.name} for ${formatSlot(start, state.config.timezone)}.`;
  }
  return a;
}
export function cancelInState(state, id, now = new Date()) {
  const a = state.appointments.find((a) => a.id === id);
  if (!a) reject("missing", "Appointment not found.");
  if (a.status === "cancelled") return a;
  if (Date.parse(a.start) <= now.getTime() + state.config.cancelNotice * 60000)
    reject(
      "cancel",
      `Cancellation is allowed only before the ${state.config.cancelNotice}-minute cutoff.`,
    );
  a.status = "cancelled";
  a.cancelledAt = now.toISOString();
  if (a.conversationId) {
    const c = state.conversations.find((c) => c.id === a.conversationId);
    if (c) {
      c.outcome = "cancelled";
      c.summary = `${a.customer} cancelled ${a.reference}. The slot has been released.`;
    }
  }
  return a;
}
export function inputFromAppointment(a, zone) {
  return {
    ...localParts(a.start, zone),
    serviceId: a.serviceId,
    customer: a.customer,
    phone: a.phone,
  };
}
