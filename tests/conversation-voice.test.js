import { it, expect } from "vitest";
import { newDialogue, replyTo, parseDetails } from "../src/domain/conversation";
import { bookInState } from "../src/domain/booking";
import { state, now } from "./helpers";
it("understands spoken clock words and a natural confirmation", async () => {
  const s = state();
  s.conversations.push({
    id: "voice-call",
    appointmentIds: [],
    outcome: "inquiry",
  });
  const repo = {
    getSnapshot: async () => s,
    book: async (input) => bookInState(s, input, now),
  };
  const first = await replyTo(
    "Book a consultation tomorrow at four PM. My name is Alex Morgan.",
    newDialogue(),
    repo,
    "voice-call",
    now,
  );
  expect(first.dialogue.phase).toBe("confirm");
  expect(first.dialogue.draft).toMatchObject({
    customer: "Alex Morgan",
    time: "16:00",
  });
  expect(s.appointments).toHaveLength(0);
  expect(
    (await replyTo("Yes, please.", first.dialogue, repo, "voice-call", now))
      .reply,
  ).toContain("You’re booked");
  expect(s.appointments).toHaveLength(1);
});
it("handles half-hour spoken times and explicit periods of day", () => {
  const c = state().config;
  expect(
    parseDetails("tomorrow at four thirty in the afternoon", c, now).time,
  ).toBe("16:30");
  expect(parseDetails("tomorrow at 10 in the morning", c, now).time).toBe(
    "10:00",
  );
});
it("answers a price question without starting a booking", async () => {
  const s = state();
  const result = await replyTo(
    "How much is a consultation?",
    newDialogue(),
    { getSnapshot: async () => s },
    "call",
    now,
  );
  expect(result.reply).toContain("₹500");
  expect(result.dialogue.phase).toBe("idle");
  expect(s.appointments).toHaveLength(0);
});
