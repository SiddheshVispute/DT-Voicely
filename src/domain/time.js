import { Temporal } from "@js-temporal/polyfill";
export const instant = (now = new Date()) =>
  Temporal.Instant.from(now.toISOString());
export const today = (zone, now = new Date()) =>
  instant(now).toZonedDateTimeISO(zone).toPlainDate().toString();
export const addDays = (date, days) =>
  Temporal.PlainDate.from(date).add({ days }).toString();
export const weekday = (date) => Temporal.PlainDate.from(date).dayOfWeek % 7;
export const minutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
export function toInstant(date, time, zone) {
  return Temporal.PlainDateTime.from(`${date}T${time}`)
    .toZonedDateTime(zone, { disambiguation: "reject" })
    .toInstant()
    .toString();
}
export function localParts(iso, zone) {
  const z = Temporal.Instant.from(iso).toZonedDateTimeISO(zone);
  return {
    date: z.toPlainDate().toString(),
    time: z.toPlainTime().toString().slice(0, 5),
  };
}
export function formatDate(iso, zone, options = {}) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    day: "numeric",
    month: "short",
    ...options,
  }).format(new Date(iso));
}
export const formatSlot = (iso, zone) =>
  formatDate(iso, zone, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
export const dateAtNoon = (date, zone) => toInstant(date, "12:00", zone);
