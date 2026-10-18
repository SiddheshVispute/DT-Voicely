import { it, expect, vi } from "vitest";
import {
  createLocalRepository,
  STORAGE_KEY,
} from "../src/data/localRepository";
import { state, memoryStorage, input } from "./helpers";
import { today, addDays, weekday } from "../src/domain/time";
function futureInput() {
  let date = addDays(today("Asia/Kolkata"), 2);
  if (weekday(date) === 0) date = addDays(date, 1);
  return { ...input, date };
}
it("survives repository recreation and preserves relationships and actual messages", async () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(state()));
  const repo = createLocalRepository(storage);
  const c = {
    id: "call",
    startedAt: new Date().toISOString(),
    messages: [
      {
        id: "m1",
        role: "customer",
        text: "Please book a consultation",
        at: new Date().toISOString(),
      },
    ],
    appointmentIds: [],
    outcome: "inquiry",
    summary: "Asked to book",
  };
  await repo.startConversation(c);
  const a = await repo.book({ ...futureInput(), conversationId: c.id });
  await repo.saveConversation({
    ...c,
    messages: [
      ...c.messages,
      {
        id: "m2",
        role: "assistant",
        text: "Confirmed",
        at: new Date().toISOString(),
      },
    ],
  });
  const loaded = await createLocalRepository(storage).getSnapshot();
  expect(loaded.appointments[0].id).toBe(a.id);
  expect(loaded.conversations[0].appointmentIds).toEqual([a.id]);
  expect(loaded.conversations[0].messages).toHaveLength(2);
  expect(loaded.conversations[0].outcome).toBe("booked");
});
it("deduplicates messages and simultaneous submissions in one repository", async () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(state()));
  const repo = createLocalRepository(storage);
  const [a, b] = await Promise.all([
    repo.book(futureInput()),
    repo.book(futureInput()),
  ]);
  expect(a.id).toBe(b.id);
  expect((await repo.getSnapshot()).confirmations).toHaveLength(1);
});
it("resets local demo data without touching unrelated storage", async () => {
  const storage = memoryStorage(),
    repo = createLocalRepository(storage);
  storage.setItem("unrelated", "preserve");
  await repo.getSnapshot();
  await repo.book({ ...futureInput(), time: "14:00", idempotencyKey: "new" });
  await repo.reset();
  const s = await repo.getSnapshot();
  expect(s.appointments).toHaveLength(1);
  expect(s.appointments[0].sample).toBe(true);
  expect(storage.getItem("unrelated")).toBe("preserve");
});
it.each(["not json", "{}", '{"version":99}'])(
  "recovers malformed storage: %s",
  async (raw) => {
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, raw);
    const repo = createLocalRepository(storage);
    expect((await repo.getSnapshot()).version).toBe(1);
    expect(repo.notice).toContain("backed up");
    expect(
      [...storage.values.keys()].some((k) => k.includes(".recovery.")),
    ).toBe(true);
  },
);
it("does not falsely succeed when a local write fails", async () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(state()));
  const repo = createLocalRepository(storage);
  storage.setItem = () => {
    throw Error("quota");
  };
  await expect(repo.book(futureInput())).rejects.toThrow("Could not save");
  expect((await repo.getSnapshot()).appointments).toHaveLength(0);
});
it("persists configuration and cancellation", async () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(state()));
  const repo = createLocalRepository(storage);
  const c = (await repo.getSnapshot()).config;
  c.name = "Test Studio";
  await repo.saveConfig(c);
  const a = await repo.book(futureInput());
  await repo.cancel(a.id);
  const loaded = await createLocalRepository(storage).getSnapshot();
  expect(loaded.config.name).toBe("Test Studio");
  expect(loaded.appointments[0].status).toBe("cancelled");
});
