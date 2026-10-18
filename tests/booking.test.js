import { describe, it, expect } from "vitest";
import {
  validateBooking,
  bookInState,
  cancelInState,
  alternatives,
} from "../src/domain/booking";
import { toInstant, localParts, today } from "../src/domain/time";
import { validateConfig } from "../src/domain/config";
import { state, input, now } from "./helpers";
describe("booking engine", () => {
  it("persists a valid booking with a confirmation", () => {
    const s = state();
    const a = bookInState(s, input, now);
    expect(s.appointments).toHaveLength(1);
    expect(a.start).toBe("2026-10-20T04:30:00Z");
    expect(s.confirmations[0].status).toBe("Simulated — Not Sent");
    expect(s.confirmations[0].message).toContain(a.reference);
  });
  it("rejects past appointments", () =>
    expect(() =>
      validateBooking(state(), { ...input, date: "2026-10-18" }, now),
    ).toThrow(/past/));
  it("rejects a closed day", () =>
    expect(() =>
      validateBooking(state(), { ...input, date: "2026-10-25" }, now),
    ).toThrow(/closed/));
  it.each(["08:45", "17:45"])("rejects outside working hours at %s", (time) =>
    expect(() => validateBooking(state(), { ...input, time }, now)).toThrow(
      /working hours/,
    ),
  );
  it("rejects exact and partial overlap", () => {
    const s = state();
    bookInState(s, input, now);
    for (const time of ["10:00", "10:15", "09:45"])
      expect(() => validateBooking(s, { ...input, time }, now)).toThrow(
        /reserved/,
      );
  });
  it("rejects buffer conflicts but permits exact buffered boundary", () => {
    const s = state();
    bookInState(s, input, now);
    expect(() => validateBooking(s, { ...input, time: "10:35" }, now)).toThrow(
      /buffer/,
    );
    expect(
      validateBooking(s, { ...input, time: "10:40" }, now).start,
    ).toBeTruthy();
  });
  it("permits back-to-back when buffer is zero", () => {
    const s = state();
    s.config.buffer = 0;
    bookInState(s, input, now);
    expect(validateBooking(s, { ...input, time: "10:30" }, now)).toBeTruthy();
  });
  it("uses the larger original buffer after settings change", () => {
    const s = state();
    bookInState(s, input, now);
    s.config.buffer = 0;
    expect(() => validateBooking(s, { ...input, time: "10:30" }, now)).toThrow(
      /buffer/,
    );
  });
  it("prevents duplicate confirmations with idempotency keys", () => {
    const s = state(),
      a = bookInState(s, input, now),
      b = bookInState(s, input, now);
    expect(a.id).toBe(b.id);
    expect(s.confirmations).toHaveLength(1);
  });
  it("releases cancelled slots and retains historical confirmation", () => {
    const s = state(),
      a = bookInState(s, input, now);
    cancelInState(s, a.id, now);
    expect(validateBooking(s, input, now)).toBeTruthy();
    expect(s.confirmations).toHaveLength(1);
    expect(cancelInState(s, a.id, now).status).toBe("cancelled");
  });
  it("rejects invalid customer and phone data", () => {
    for (const customer of ["", "A", "123", "<script>"])
      expect(() =>
        validateBooking(state(), { ...input, customer }, now),
      ).toThrow(/name/);
    expect(() =>
      validateBooking(state(), { ...input, phone: "bad" }, now),
    ).toThrow(/phone/);
  });
  it("rejects unknown services", () =>
    expect(() =>
      validateBooking(state(), { ...input, serviceId: "unknown" }, now),
    ).toThrow(/service/));
  it("rejects nonexistent dates, invalid times, and DST gaps/ambiguity", () => {
    for (const [date, time] of [
      ["2026-02-30", "10:00"],
      ["2026-10-20", "25:00"],
    ])
      expect(() =>
        validateBooking(state(), { ...input, date, time }, now),
      ).toThrow(/valid date/);
    expect(() =>
      toInstant("2027-03-14", "02:30", "America/New_York"),
    ).toThrow();
    expect(() =>
      toInstant("2026-11-01", "01:30", "America/New_York"),
    ).toThrow();
  });
  it("converts local dates at UTC day boundaries", () => {
    const iso = toInstant("2026-10-20", "00:15", "Asia/Kolkata");
    expect(iso).toBe("2026-10-19T18:45:00Z");
    expect(localParts(iso, "Asia/Kolkata")).toEqual({
      date: "2026-10-20",
      time: "00:15",
    });
    expect(today("Asia/Kolkata", new Date("2026-10-19T20:00Z"))).toBe(
      "2026-10-20",
    );
  });
  it("offers valid alternatives", () => {
    const s = state();
    bookInState(s, input, now);
    const options = alternatives(s, input, now);
    expect(options).toHaveLength(3);
    options.forEach((x) =>
      expect(validateBooking(s, { ...input, ...x }, now)).toBeTruthy(),
    );
  });
  it("enforces notice, advance and cancellation cutoffs", () => {
    const s = state();
    s.config.minNotice = 1000;
    expect(() =>
      validateBooking(s, { ...input, date: "2026-10-19" }, now),
    ).toThrow(/ahead/);
    s.config.minNotice = 0;
    s.config.advanceDays = 1;
    expect(() =>
      validateBooking(s, { ...input, date: "2026-10-21" }, now),
    ).toThrow(/ahead/);
    const a = bookInState(s, input, now);
    s.config.cancelNotice = 9999;
    expect(() => cancelInState(s, a.id, now)).toThrow(/cutoff/);
  });
  it("links booking and call outcome atomically in state", () => {
    const s = state();
    s.conversations.push({
      id: "call",
      appointmentIds: [],
      outcome: "inquiry",
    });
    const a = bookInState(s, { ...input, conversationId: "call" }, now);
    expect(s.conversations[0].appointmentIds).toEqual([a.id]);
    expect(s.conversations[0].outcome).toBe("booked");
  });
  it("validates config and service durations", () => {
    const c = state().config;
    c.services[0].duration = 0;
    expect(() => validateConfig(c)).toThrow(/service/);
  });
});
