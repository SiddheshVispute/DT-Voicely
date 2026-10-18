import { it, expect, beforeEach } from "vitest";
import { newDialogue, replyTo, parseDetails } from "../src/domain/conversation";
import { bookInState, cancelInState } from "../src/domain/booking";
import { state, input, now } from "./helpers";
let s, repo, d;
beforeEach(() => {
  s = state();
  s.conversations.push({ id: "call", appointmentIds: [], outcome: "inquiry" });
  d = newDialogue();
  repo = {
    getSnapshot: async () => structuredClone(s),
    book: async (i) => bookInState(s, i, now),
    cancel: async (id) => cancelInState(s, id, now),
  };
});
async function say(text) {
  const result = await replyTo(text, d, repo, "call", now);
  d = result.dialogue;
  return result.reply;
}
it("greets and explains supported tasks", async () =>
  expect(await say("hello")).toContain("book an appointment"));
it("lists configured services and business information", async () => {
  expect(await say("What treatments do you offer?")).toContain(
    "Therapy session",
  );
  expect(await say("Where are you located?")).toContain("Garden Lane");
});
it("retains details through multiple steps, requires confirmation, and saves", async () => {
  expect(await say("I want a consultation tomorrow at 4 PM.")).toContain(
    "full name",
  );
  expect(d.draft).toMatchObject({
    serviceId: "consultation",
    date: "2026-10-20",
    time: "16:00",
  });
  expect(s.appointments).toHaveLength(0);
  expect(await say("My name is Alex Morgan")).toContain(
    "Nothing is booked yet",
  );
  expect(s.appointments).toHaveLength(0);
  expect(await say("confirm")).toContain("You’re booked");
  expect(s.appointments).toHaveLength(1);
  expect(s.appointments[0].conversationId).toBe("call");
  expect(await say("confirm")).toContain("I can help");
  expect(s.appointments).toHaveLength(1);
});
it("requests each missing field and accepts plain names", async () => {
  expect(await say("Book an appointment")).toContain("Which service");
  expect(await say("Consultation")).toContain("full name");
  expect(await say("Alex Morgan")).toContain("What date");
  expect(await say("2026-10-20")).toContain("What time");
  expect(await say("10 AM")).toContain("Please review");
  expect(s.appointments).toHaveLength(0);
});
it("rejects ambiguous dates and times while retaining details", async () => {
  expect(await say("Book consultation on 03/04 at 4 PM")).toContain(
    "ambiguous",
  );
  expect(d.draft.time).toBe("16:00");
  expect(await say("tomorrow at 4")).toContain("exact time");
});
it("does not create an appointment merely from a date and time", async () => {
  await say("2026-10-20 at 10 AM");
  expect(s.appointments).toHaveLength(0);
});
it("handles unavailable slots with valid alternatives and option selection", async () => {
  bookInState(s, input, now);
  await say("Book consultation tomorrow at 10 AM");
  expect(await say("My name is Jamie Parker")).toContain(
    "Available alternatives",
  );
  expect(d.alternatives).toHaveLength(3);
  expect(await say("1")).toContain("Please review");
  await say("yes");
  expect(s.appointments).toHaveLength(2);
});
it("rechecks availability if the slot was taken before confirmation", async () => {
  await say("Book consultation tomorrow at 10 AM");
  await say("My name is Jamie Parker");
  bookInState(s, input, now);
  expect(await say("confirm")).toContain("couldn’t save");
  expect(s.appointments).toHaveLength(1);
  expect(d.phase).toBe("collect");
});
it("reports persistence errors without successful booking claims", async () => {
  await say("Book consultation tomorrow at 10 AM");
  await say("My name is Alex Morgan");
  repo.book = async () => {
    throw Error("Storage full");
  };
  expect(await say("confirm")).toContain("Storage full");
  expect(s.appointments).toHaveLength(0);
});
it("handles unsupported intent and ends gracefully", async () => {
  expect(await say("write a poem about cats")).toContain("I can help");
  expect(await say("goodbye")).toContain("Take care");
  expect(d.phase).toBe("ended");
});
it("cancels only after identification and explicit confirmation", async () => {
  const a = bookInState(s, input, now);
  expect(await say("Cancel my appointment")).toContain("reference");
  expect(s.appointments[0].status).toBe("confirmed");
  expect(await say(a.reference)).toContain("Say “confirm” to cancel");
  await say("confirm");
  expect(s.appointments[0].status).toBe("cancelled");
});
it("accepts changing a proposal before confirmation", async () => {
  await say("Book consultation tomorrow at 10 AM");
  await say("My name is Alex Morgan");
  await say("make it 2 PM");
  expect(d.draft.time).toBe("14:00");
  await say("confirm");
  expect(s.appointments[0].start).toContain("08:30");
});
it("uses services changed in configuration", async () => {
  s.config.services.push({
    id: "massage",
    name: "Massage",
    duration: 45,
    price: 800,
    description: "Relaxation",
  });
  expect(await say("What services do you offer?")).toContain("Massage");
  await say("Book a Massage tomorrow at 10 AM");
  expect(d.draft.serviceId).toBe("massage");
});
it("accepts named month dates and names supplied in the first request", async () => {
  expect(
    await say("Book a consultation for Alex Morgan on October 21 at 4 PM"),
  ).toContain("Please review");
  expect(d.draft).toMatchObject({
    customer: "Alex Morgan",
    date: "2026-10-21",
    time: "16:00",
  });
  expect(s.appointments).toHaveLength(0);
});
