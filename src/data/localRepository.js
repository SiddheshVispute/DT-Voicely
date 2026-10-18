import { defaultConfig, validateConfig, greetingFor } from "../domain/config";
import { bookInState, cancelInState } from "../domain/booking";
import { today, addDays, weekday, toInstant } from "../domain/time";
export const STORAGE_KEY = "voicely.demo.v1";
export function initialState(now = new Date()) {
  const config = structuredClone(defaultConfig);
  let date = addDays(today(config.timezone, now), 1);
  while (!config.hours[weekday(date)].open) date = addDays(date, 1);
  const state = {
    version: 1,
    revision: 0,
    config,
    appointments: [],
    conversations: [],
    confirmations: [],
  };
  const c = {
    id: crypto.randomUUID(),
    startedAt: now.toISOString(),
    endedAt: now.toISOString(),
    outcome: "inquiry",
    summary: "Sample conversation: a customer asked about available services.",
    appointmentIds: [],
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
      serviceId: "consultation",
      date,
      time: "11:00",
      conversationId: c.id,
      idempotencyKey: "sample-booking",
    },
    now,
  );
  a.sample = true;
  c.summary = "Sample booking for Ananya Rao. This record is fictional.";
  c.outcome = "booked";
  state.confirmations[0].sample = true;
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
        // A booking transaction owns its outcome/relationships; transcript saves must not overwrite them.
        if (!current.appointmentIds.length) {
          current.outcome = c.outcome;
          current.summary = c.summary;
        }
        if (c.endedAt) current.endedAt = c.endedAt;
        return current;
      }),
    book: (input) => mutate((s) => bookInState(s, input)),
    cancel: (id) => mutate((s) => cancelInState(s, id)),
    reset: () =>
      mutate((s) => {
        Object.assign(s, initialState());
        return s;
      }),
  };
}
