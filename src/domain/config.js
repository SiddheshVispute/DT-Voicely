export const defaultConfig = {
  name: "Willow Wellness",
  category: "Wellness & care",
  address: "24 Garden Lane, Bengaluru",
  phone: "+91 80 5550 0142",
  timezone: "Asia/Kolkata",
  duration: 30,
  buffer: 10,
  minNotice: 0,
  advanceDays: 60,
  cancelNotice: 0,
  hours: Object.fromEntries(
    [0, 1, 2, 3, 4, 5, 6].map((day) => [
      day,
      { open: day !== 0, start: "09:00", end: "18:00" },
    ]),
  ),
  services: [
    {
      id: "consultation",
      name: "Consultation",
      duration: 30,
      price: 500,
      description: "A thoughtful first conversation about your wellness goals.",
    },
    {
      id: "therapy",
      name: "Therapy session",
      duration: 60,
      price: 1500,
      description: "One-to-one support with a wellness practitioner.",
    },
    {
      id: "followup",
      name: "Follow-up",
      duration: 20,
      price: 300,
      description: "Check in, review progress, and plan your next step.",
    },
  ],
  agent: {
    name: "Mia",
    greeting:
      "Hello! Welcome to {business}. I’m {agent}, your virtual receptionist. How can I help you today?",
    tone: "Warm and professional",
    speak: false,
  },
};
export const greetingFor = (c) =>
  c.agent.greeting
    .replaceAll("{business}", c.name)
    .replaceAll("{agent}", c.agent.name);
export function validateConfig(c) {
  if (!c.name?.trim() || c.name.length > 100)
    throw new Error("Enter a business name (up to 100 characters).");
  try {
    new Intl.DateTimeFormat("en", { timeZone: c.timezone }).format();
  } catch {
    throw new Error("Enter a valid IANA timezone, such as Asia/Kolkata.");
  }
  for (const [key, min, max] of [
    ["duration", 5, 480],
    ["buffer", 0, 120],
    ["minNotice", 0, 10080],
    ["advanceDays", 1, 365],
    ["cancelNotice", 0, 10080],
  ]) {
    if (!Number.isInteger(c[key]) || c[key] < min || c[key] > max)
      throw new Error(
        `Invalid ${key}: use a whole number from ${min} to ${max}.`,
      );
  }
  if (
    !c.services?.length ||
    new Set(c.services.map((s) => s.id)).size !== c.services.length
  )
    throw new Error("Add at least one service with a unique identifier.");
  for (const s of c.services)
    if (
      !s.id ||
      !s.name?.trim() ||
      !Number.isInteger(s.duration) ||
      s.duration < 5 ||
      s.duration > 480 ||
      !Number.isFinite(s.price) ||
      s.price < 0
    )
      throw new Error(
        "Every service needs a name, a duration from 5–480 minutes, and a valid price.",
      );
  for (let day = 0; day < 7; day++) {
    const h = c.hours?.[day];
    if (
      !h ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.end) ||
      (h.open && h.start >= h.end)
    )
      throw new Error(
        "Working hours must start before they end on each open day.",
      );
  }
  if (!c.agent?.name?.trim() || !c.agent?.greeting?.trim())
    throw new Error("The receptionist needs a name and greeting.");
  return c;
}
