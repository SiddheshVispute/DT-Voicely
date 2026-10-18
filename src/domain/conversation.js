import { Temporal } from "@js-temporal/polyfill";
import { today, addDays, weekday, formatSlot, localParts } from "./time";
import { validateBooking, alternatives } from "./booking";
export const newDialogue = () => ({
  phase: "idle",
  draft: {},
  proposal: null,
  alternatives: [],
  cancellation: null,
});
export const message = (role, text) => ({
  id: crypto.randomUUID(),
  role,
  text,
  at: new Date().toISOString(),
});
export function parseDetails(text, c, now = new Date()) {
  const spokenNumbers = [
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
  ];
  text = text.replace(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s+(fifteen|thirty|forty[- ]five))?\s*(?:o['’]?clock\s*)?(a\.?\s*m\.?|p\.?\s*m\.?|in the morning|in the afternoon|in the evening)\b/gi,
    (_, hour, part, period) =>
      `${spokenNumbers.indexOf(hour.toLowerCase()) + 1}:${part ? (/fifteen/i.test(part) ? "15" : /thirty/i.test(part) ? "30" : "45") : "00"} ${/^(?:p|in the (?:afternoon|evening))/i.test(period) ? "PM" : "AM"}`,
  );
  text = text.replace(
    /\b(\d{1,2})\s+in the (morning|afternoon|evening)\b/gi,
    (_, hour, period) =>
      `${hour} ${period.toLowerCase() === "morning" ? "AM" : "PM"}`,
  );
  const lower = text.toLowerCase(),
    out = {};
  const service = c.services.find(
    (s) =>
      lower.includes(s.name.toLowerCase()) ||
      lower.includes(s.id) ||
      (s.id === "followup" && /follow[ -]?up/.test(lower)),
  );
  if (service) out.serviceId = service.id;
  const name = text.match(
    /(?:my name is|name['’]?s|i am|i['’]m|for (?:a customer named|customer|me,?))\s+([\p{L}][\p{L}\p{M} .’'-]*?)(?=\s+(?:and|tomorrow|today|on|at|for|i want|i would)|[,.!?\n]|$)/iu,
  );
  if (name) out.customer = name[1].trim().replace(/\.$/, "");
  if (!out.customer) {
    const forName = text.match(
      /\bfor\s+([A-Z][\p{L}\p{M}’'-]+(?:\s+[A-Z][\p{L}\p{M}’'-]+){0,3})(?=\s+(?:on|at|tomorrow|today)|[,!.]|$)/u,
    );
    if (
      forName &&
      !c.services.some((s) => s.name.toLowerCase() === forName[1].toLowerCase())
    )
      out.customer = forName[1].trim();
  }
  if (
    out.customer &&
    /^(?:looking|interested|trying|want|booking|here|calling)\b/i.test(
      out.customer,
    )
  )
    delete out.customer;
  const phone = text.match(
    /(?:phone|number|mobile)\s*(?:is|:)?\s*(\+?[\d ()-]{7,20})/i,
  );
  if (phone) out.phone = phone[1].trim();
  const base = today(c.timezone, now);
  if (/day after tomorrow/.test(lower)) out.date = addDays(base, 2);
  else if (/\btomorrow\b/.test(lower)) out.date = addDays(base, 1);
  else if (/\btoday\b/.test(lower)) out.date = base;
  else {
    const iso = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (iso) {
      try {
        out.date = Temporal.PlainDate.from(iso[1]).toString();
      } catch {
        out.dateError = true;
      }
    }
  }
  if (!out.date) {
    const months = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const named = lower.match(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/,
    );
    if (named) {
      try {
        let date = Temporal.PlainDate.from(
          {
            year: Number(named[3] || base.slice(0, 4)),
            month: months.indexOf(named[1]) + 1,
            day: Number(named[2]),
          },
          { overflow: "reject" },
        );
        if (!named[3] && date.toString() < base) date = date.add({ years: 1 });
        out.date = date.toString();
      } catch {
        out.dateError = true;
      }
    }
  }
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  if (!out.date) {
    const day = days.findIndex((d) => lower.includes(d));
    if (day >= 0) {
      let n = (day - weekday(base) + 7) % 7;
      if (n === 0) n = 7;
      if (lower.includes("next week")) n += 7;
      out.date = addDays(base, n);
    }
  }
  if (
    /\b\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?\b/.test(lower) ||
    (/\b(?:next week|next month|this weekend)\b/.test(lower) && !out.date)
  )
    out.dateError = true;
  const t = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/);
  const military = lower.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (t) {
    let h = Number(t[1]),
      m = Number(t[2] || 0);
    if (h < 1 || h > 12 || m > 59) out.timeError = true;
    else {
      h = (h % 12) + (t[3].startsWith("p") ? 12 : 0);
      out.time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  } else if (military)
    out.time = `${military[1].padStart(2, "0")}:${military[2]}`;
  else if (
    /\bat\s+\d{1,2}\b|^\d{1,2}$|\b(?:morning|afternoon|evening)\b/.test(lower)
  )
    out.timeError = true;
  return out;
}
function serviceInfo(c) {
  return c.services
    .map((s) => `${s.name} (${s.duration} min, ₹${s.price}) — ${s.description}`)
    .join("\n");
}
export async function replyTo(
  text,
  dialogue,
  repository,
  conversationId,
  now = new Date(),
) {
  const d = structuredClone(dialogue),
    state = await repository.getSnapshot(),
    c = state.config;
  const lower = text.trim().toLowerCase();
  const result = (reply) => ({
    dialogue: d,
    reply:
      c.agent.tone === "Concise and helpful"
        ? reply
            .replace(/^Of course\. /, "")
            .replace(/^You’re booked! /, "Confirmed. ")
        : reply,
  });
  if (!lower) return result("Please type a request or use the microphone.");
  if (
    /^(bye|goodbye|end|hang up|that['’]?s all|thanks,? bye)[.! ]*$/.test(lower)
  ) {
    d.phase = "ended";
    return result("Thank you for contacting us. Take care!");
  }
  if (
    /\b(?:services|offer|treatments|price|pricing|cost|how much|what do you do)\b/.test(
      lower,
    ) &&
    !/\b(?:book|reserve|schedule)\b/.test(lower)
  )
    return result(
      `Here’s what we offer:\n${serviceInfo(c)}\nWhich service would you like to book?`,
    );
  if (
    /\b(?:address|located|location|where are|hours|open|phone number|business info)\b/.test(
      lower,
    )
  ) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return result(
      `${c.name} is at ${c.address}. Call ${c.phone}.\n${days.map((day, i) => `${day}: ${c.hours[i].open ? `${c.hours[i].start}–${c.hours[i].end}` : "closed"}`).join("; ")}. All appointments use ${c.timezone}.`,
    );
  }
  const yes =
    /^(yes|yes,? please|yeah|yep|okay,? confirm|confirm|confirm (?:the )?(?:booking|appointment)|confirmed|go ahead|please confirm|book it|that works|correct|sure)[.! ]*$/.test(
      lower,
    );
  const no = /^(no|no thanks|never mind|nevermind|start over)[.! ]*$/.test(
    lower,
  );
  if (no) {
    Object.assign(d, newDialogue());
    return result(
      "No problem. I haven’t made any new booking. How else can I help?",
    );
  }
  if (d.phase === "cancel-confirm" && yes) {
    try {
      const a = await repository.cancel(d.cancellation.id);
      Object.assign(d, newDialogue());
      return result(
        `Cancelled ${a.reference} for ${a.customer}. The slot has been released.`,
      );
    } catch (e) {
      return result(`I couldn’t cancel that appointment: ${e.message}`);
    }
  }
  if (
    /\b(?:cancel|cancellation)\b/.test(lower) ||
    d.phase === "cancel-identify"
  ) {
    const ref = text.match(/VC-[a-f\d]{8}/i)?.[0].toUpperCase();
    const parsed = parseDetails(text, c, now);
    let name = parsed.customer;
    if (
      !name &&
      d.phase === "cancel-identify" &&
      /^[\p{L} .’'-]{2,80}$/u.test(text.trim()) &&
      !/cancel|appointment/i.test(text)
    )
      name = text.trim();
    const matches = state.appointments.filter(
      (a) =>
        a.status === "confirmed" &&
        (ref
          ? a.reference === ref
          : name
            ? a.customer.toLowerCase() === name.toLowerCase()
            : false) &&
        (!parsed.date || localParts(a.start, c.timezone).date === parsed.date),
    );
    if (matches.length === 1) {
      d.phase = "cancel-confirm";
      d.cancellation = matches[0];
      return result(
        `Cancel ${matches[0].serviceName} for ${matches[0].customer}, ${formatSlot(matches[0].start, c.timezone)}, reference ${matches[0].reference}? Say “confirm” to cancel.`,
      );
    }
    d.phase = "cancel-identify";
    return result(
      matches.length > 1
        ? `I found more than one booking. Please give the exact reference: ${matches.map((a) => a.reference).join(", ")}.`
        : "Please provide the exact booking reference (VC-…) or the full name used for the booking.",
    );
  }
  if (d.phase === "confirm" && yes) {
    try {
      const a = await repository.book({
        ...d.draft,
        idempotencyKey: d.proposal.key,
        conversationId,
      });
      Object.assign(d, newDialogue());
      return result(
        `You’re booked! ${a.serviceName} for ${a.customer}, ${formatSlot(a.start, c.timezone)} (${c.timezone}). Reference: ${a.reference}. Your confirmation preview is ready in Appointments; it is simulated and has not been sent.`,
      );
    } catch (e) {
      d.phase = "collect";
      d.proposal = null;
      d.alternatives = alternatives(
        await repository.getSnapshot(),
        d.draft,
        now,
      );
      return result(
        `I couldn’t save the booking: ${e.message}${d.alternatives.length ? " Available alternatives: " + d.alternatives.map((x) => x.label).join("; ") : ""}. Please choose a time and confirm again.`,
      );
    }
  }
  const parsed = parseDetails(text, c, now);
  if (d.alternatives.length) {
    const choice = lower.match(/^(?:option\s*)?([1-3])$/);
    if (choice && d.alternatives[Number(choice[1]) - 1]) {
      Object.assign(parsed, d.alternatives[Number(choice[1]) - 1]);
      delete parsed.timeError;
    }
  }
  const bookingIntent =
    /\b(?:book|appointment|schedule|reserve|consultation|therapy|follow[ -]?up)\b/.test(
      lower,
    ) || !!(parsed.serviceId && /\b(?:want|need|like|request)\b/.test(lower));
  if (d.phase === "idle" && !bookingIntent) {
    if (
      /^(hi|hello|hey|good morning|good afternoon|thanks|thank you)[.! ]*$/.test(
        lower,
      )
    )
      return result(
        `Hello! I can tell you about ${c.name}, book an appointment, or help cancel a booking. What can I do for you?`,
      );
    return result(
      "I can help with services, business hours, booking, or cancelling appointments. For example: “Book a consultation tomorrow at 4 PM.”",
    );
  }
  if (
    !parsed.customer &&
    d.phase === "collect" &&
    !d.draft.customer &&
    /^[\p{L}][\p{L}\p{M} .’'-]{1,79}$/u.test(text.trim()) &&
    !/book|appointment|tomorrow|today|consultation|therapy|follow|confirm|yes|no|^(?:hi|hello|help|what|why|how|i don['’]?t|i do not|not sure)\b/i.test(
      text,
    )
  )
    parsed.customer = text.trim();
  if (parsed.dateError) {
    d.phase = "collect";
    delete parsed.date;
    Object.assign(
      d.draft,
      Object.fromEntries(
        Object.entries(parsed).filter(([k]) => !k.endsWith("Error")),
      ),
    );
    d.proposal = null;
    return result(
      "That date is ambiguous or invalid. Please use YYYY-MM-DD (for example, " +
        addDays(today(c.timezone, now), 1) +
        ").",
    );
  }
  if (parsed.timeError) {
    d.phase = "collect";
    Object.assign(
      d.draft,
      Object.fromEntries(
        Object.entries(parsed).filter(([k]) => !k.endsWith("Error")),
      ),
    );
    d.proposal = null;
    return result(
      "Please give an exact time with AM/PM, such as 4 PM, or use 24-hour time such as 16:00.",
    );
  }
  Object.assign(d.draft, parsed);
  d.phase = "collect";
  d.proposal = null;
  if (!d.draft.serviceId)
    return result(
      `Which service would you like? ${c.services.map((s) => s.name).join(", ")}.`,
    );
  if (!d.draft.customer)
    return result("Of course. What is the customer’s full name?");
  if (!d.draft.date)
    return result(
      `What date would you prefer? You can say “tomorrow” or use YYYY-MM-DD. Times are in ${c.timezone}.`,
    );
  if (!d.draft.time)
    return result(
      "What time would you prefer? Please include AM/PM or use 24-hour time.",
    );
  try {
    const { service, start } = validateBooking(state, d.draft, now);
    d.phase = "confirm";
    d.alternatives = [];
    d.proposal = { key: crypto.randomUUID(), start };
    return result(
      `Please review: ${service.name} (${service.duration} minutes) for ${d.draft.customer}, ${formatSlot(start, c.timezone)} (${c.timezone}). Say “confirm” to save, or tell me what to change. Nothing is booked yet.`,
    );
  } catch (e) {
    d.alternatives = alternatives(state, d.draft, now);
    if (e.code === "customer") delete d.draft.customer;
    return result(
      `${e.message}${d.alternatives.length ? " Available alternatives:\n" + d.alternatives.map((a, i) => `${i + 1}. ${a.label}`).join("\n") + "\nChoose an option number or another date and time." : " Please choose another date or provide the missing details."}`,
    );
  }
}
