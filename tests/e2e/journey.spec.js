import { test, expect } from "@playwright/test";
test("complete persisted demo: book, inspect, conflict, cancel, release, refresh", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /A warm welcome/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Try Live Demo" }).first().click();
  await expect(
    page.getByRole("heading", { name: /A little more room/ }),
  ).toBeVisible();
  async function nav(name) {
    if (testInfo.project.name === "mobile")
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
    await page
      .getByRole("navigation")
      .getByRole("link", { name, exact: true })
      .click();
  }
  await nav("Voice Agent");
  await page
    .getByRole("button", { name: "Start conversation", exact: true })
    .click();
  const transcript = page.getByRole("log");
  async function say(text) {
    await page
      .getByRole("textbox", { name: "Message receptionist" })
      .fill(text);
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Message receptionist" }),
    ).toBeEnabled();
  }
  await say("What services do you offer?");
  await expect(transcript).toContainText("Therapy session");
  await say("I would like to book a consultation");
  await expect(transcript).toContainText("full name");
  await say("My name is Professor Taylor");
  await expect(transcript).toContainText("What date");
  let date = new Date();
  date.setUTCDate(date.getUTCDate() + 2);
  while (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  const day = date.toISOString().slice(0, 10);
  await say(`${day} at 2 PM`);
  await expect(transcript).toContainText("Nothing is booked yet");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("voicely.demo.v1")).appointments.filter(
          (a) => a.customer === "Professor Taylor",
        ).length,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Confirm booking", exact: true })
    .click();
  await expect(transcript).toContainText("You’re booked!");
  const a = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("voicely.demo.v1")).appointments.find(
      (a) => a.customer === "Professor Taylor",
    ),
  );
  expect(a.conversationId).toBeTruthy();
  await nav("Appointments");
  await page
    .getByRole("textbox", { name: "Search appointments", exact: true })
    .fill("Professor Taylor");
  await page
    .getByRole("button", { name: "View Professor Taylor", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(a.reference);
  await expect(dialog).toContainText("Simulated — Not Sent");
  await expect(dialog).toContainText("Hi Professor Taylor");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(
    page.locator(".calendar-booking").filter({ hasText: "Professor Taylor" }),
  ).toBeVisible();
  await nav("Call Logs");
  await page
    .getByRole("textbox", { name: "Search conversations", exact: true })
    .fill("Professor Taylor");
  await page.getByRole("button", { name: /Inspect conversation/ }).click();
  await expect(dialog).toContainText("What services do you offer?");
  await expect(dialog).toContainText("You’re booked!");
  await expect(dialog).toContainText(a.reference);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await nav("Overview");
  await expect(page.getByTestId("metric-confirmed")).toHaveText("2");
  await expect(page.getByTestId("metric-confirmation")).toHaveText("2");
  await nav("Voice Agent");
  await say(`Book a consultation for tomorrow`);
  await say("My name is Jamie Parker");
  await say(`${day} at 2 PM`);
  await expect(transcript).toContainText("Available alternatives");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("voicely.demo.v1")).appointments.length,
    ),
  ).toBe(2);
  await page
    .getByRole("button", { name: "End conversation", exact: true })
    .click();
  await nav("Appointments");
  await page
    .getByRole("textbox", { name: "Search appointments", exact: true })
    .fill("Professor Taylor");
  await page
    .getByRole("button", { name: "View Professor Taylor", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Cancel appointment", exact: true })
    .click();
  await expect(dialog.getByText("cancelled", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await nav("Voice Agent");
  await page
    .getByRole("button", { name: "Start conversation", exact: true })
    .click();
  await say(`Book a consultation on ${day} at 2 PM`);
  await say("My name is Riley Adams");
  await expect(transcript).toContainText("Nothing is booked yet");
  await say("confirm");
  await expect(transcript).toContainText("You’re booked!");
  await page
    .getByRole("button", { name: "End conversation", exact: true })
    .click();
  await page.reload();
  await nav("Appointments");
  await expect(page.getByText("Riley Adams", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Professor Taylor", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("voicely.demo.v1")).appointments.find(
          (a) => a.customer === "Professor Taylor",
        ).status,
    ),
  ).toBe("cancelled");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `screenshots/${testInfo.project.name}-appointments.png`,
    fullPage: true,
  });
});
test("manual review, filters, settings and reset", async ({
  page,
}, testInfo) => {
  await page.goto("/app/appointments");
  await page
    .getByRole("button", { name: "New appointment", exact: true })
    .click();
  await page
    .getByLabel("Customer name", { exact: true })
    .fill("Manual Customer");
  await page
    .getByLabel("Date (Asia/Kolkata)", { exact: true })
    .fill("2000-01-01");
  await page
    .getByRole("button", { name: "Check availability", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("past");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  async function nav(name) {
    if (testInfo.project.name === "mobile")
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
    await page
      .getByRole("navigation")
      .getByRole("link", { name, exact: true })
      .click();
  }
  await nav("Settings");
  await page
    .getByLabel("Business name", { exact: true })
    .fill("Professor’s Studio");
  await page
    .getByRole("button", { name: "Save business settings", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Business settings saved",
  );
  await page.reload();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Professor’s Studio",
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Reset Demo Data", exact: true })
    .click();
  await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
    "Willow Wellness",
  );
  await nav("Voice Agent");
  await page.getByLabel("Receptionist name", { exact: true }).fill("Ava");
  await page
    .getByRole("button", { name: "Save configuration", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ava, at your service." }),
  ).toBeVisible();
  await page.screenshot({
    path: `screenshots/${testInfo.project.name}-agent.png`,
    fullPage: true,
  });
});
test("manual booking is reviewed, persisted, filtered and cancellable", async ({
  page,
}) => {
  await page.goto("/app/appointments");
  await page
    .getByRole("button", { name: "New appointment", exact: true })
    .click();
  await page
    .getByLabel("Customer name", { exact: true })
    .fill("Manual Customer");
  await page
    .getByLabel("Phone (optional)", { exact: true })
    .fill("+91 9876543210");
  let date = new Date();
  date.setUTCDate(date.getUTCDate() + 3);
  while (date.getUTCDay() === 0) date.setUTCDate(date.getUTCDate() + 1);
  await page
    .getByLabel("Date (Asia/Kolkata)", { exact: true })
    .fill(date.toISOString().slice(0, 10));
  await page.getByLabel("Time", { exact: true }).fill("14:00");
  await page
    .getByRole("button", { name: "Check availability", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Confirm to save");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("voicely.demo.v1")).appointments.some(
        (a) => a.customer === "Manual Customer",
      ),
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Confirm appointment", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Simulated — Not Sent");
  await expect(page.getByRole("dialog")).toContainText("+91 9876543210");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Cancel appointment", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText("cancelled", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Appointment status", exact: true })
    .selectOption("confirmed");
  await expect(page.getByText("Manual Customer", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("combobox", { name: "Appointment status", exact: true })
    .selectOption("cancelled");
  await expect(
    page.getByText("Manual Customer", { exact: true }),
  ).toBeVisible();
});
test("Web Locks prevent concurrent conflicting bookings across tabs", async ({
  page,
  context,
}) => {
  await page.goto("/app");
  const second = await context.newPage();
  await second.goto("/app");
  const run = (page) =>
    page.evaluate(async () => {
      const { createLocalRepository } = await import(
        "/src/data/localRepository.js"
      );
      const { today, addDays, weekday } = await import("/src/domain/time.js");
      let date = addDays(today("Asia/Kolkata"), 4);
      while (weekday(date) === 0) date = addDays(date, 1);
      try {
        const a = await createLocalRepository().book({
          customer: "Concurrent Customer",
          serviceId: "consultation",
          date,
          time: "14:00",
          idempotencyKey: crypto.randomUUID(),
        });
        return { ok: true, id: a.id };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    });
  const results = await Promise.all([run(page), run(second)]);
  expect(results.filter((r) => r.ok)).toHaveLength(1);
  expect(results.find((r) => !r.ok).error).toContain("reserved");
});
test("landing and overview render at the viewport width", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page.screenshot({
    path: `screenshots/${testInfo.project.name}-landing.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: /A little more room/ }),
  ).toBeVisible();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: `screenshots/${testInfo.project.name}-overview.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
