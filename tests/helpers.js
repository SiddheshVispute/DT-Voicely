import { defaultConfig } from "../src/domain/config";
export const now = new Date("2026-10-19T02:00:00Z");
export const input = {
  customer: "Alex Morgan",
  serviceId: "consultation",
  date: "2026-10-20",
  time: "10:00",
  idempotencyKey: "one",
};
export function state() {
  return {
    version: 1,
    revision: 0,
    config: structuredClone(defaultConfig),
    appointments: [],
    conversations: [],
    confirmations: [],
  };
}
export function memoryStorage() {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
    values,
  };
}
