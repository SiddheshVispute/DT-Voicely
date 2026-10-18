import { chromium, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const root = new URL("../", import.meta.url),
  base = process.env.VOICELY_TEST_URL || "http://127.0.0.1:5188";
const fixture = fileURLToPath(
    new URL("tests/fixtures/booking-request.wav", root),
  ),
  wav = await readFile(fixture),
  dataOffset = wav.indexOf(Buffer.from("data")),
  duration = wav.readUInt32LE(dataOffset + 4) / wav.readUInt32LE(28);
const context = await chromium.launchPersistentContext(
  fileURLToPath(new URL(".voice-test-profile/", root)),
  {
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    permissions: ["microphone"],
    args: [
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${fixture}`,
      "--autoplay-policy=no-user-gesture-required",
    ],
  },
);
try {
  const page = context.pages()[0] || (await context.newPage()),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // This profile belongs only to this test. Reset its fictional data through the real UI.
  await page.goto(base + "/app/settings");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Reset Demo Data", exact: true })
    .click();
  await page.goto(base + "/app/agent");
  const before = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("voicely.demo.v1")).appointments.length,
  );
  await page
    .getByRole("button", { name: "Start voice conversation", exact: true })
    .click();
  console.log(
    "Preparing real voice model (first download can take 1–2 minutes)…",
  );
  await expect(page.locator(".voice-stage .badge")).toHaveText("Listening", {
    timeout: 240000,
  });
  console.log("Capturing synthetic microphone audio through MediaRecorder…");
  await page.waitForTimeout(Math.min(duration * 1000 + 200, 19000));
  if (
    await page
      .getByRole("button", { name: "Finish speaking", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Finish speaking", exact: true })
      .click();
  await expect(page.getByRole("log")).toContainText("Please review", {
    timeout: 60000,
  });
  if (
    await page
      .getByRole("button", { name: "Pause voice", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Pause voice", exact: true })
      .click();
  const messages = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("voicely.demo.v1"))
          .conversations.filter((c) => !c.sample)
          .at(-1).messages,
    ),
    recognized = messages
      .filter((m) => m.role === "customer")
      .map((m) => m.text)
      .join(" ");
  if (!/consultation/i.test(recognized) || !/Alex Morgan/i.test(recognized))
    throw Error("Unexpected real transcription: " + recognized);
  const unconfirmed = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("voicely.demo.v1")).appointments.length,
  );
  if (unconfirmed !== before)
    throw Error("An appointment was created before confirmation.");
  await page
    .getByRole("button", { name: "Confirm booking", exact: true })
    .click();
  await expect(page.getByRole("log")).toContainText("You’re booked!");
  const appointment = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("voicely.demo.v1"))
      .appointments.filter((a) => !a.sample)
      .at(-1),
  );
  if (appointment.customer !== "Alex Morgan")
    throw Error("Wrong customer: " + appointment.customer);
  await page
    .getByRole("button", { name: "End conversation", exact: true })
    .click();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: fileURLToPath(
      new URL("screenshots/voice-recorded-booking.png", root),
    ),
    fullPage: true,
  });
  const result = {
    syntheticMicrophone: true,
    realTranscription: true,
    recognized,
    prematureBooking: false,
    appointment: {
      customer: appointment.customer,
      service: appointment.serviceName,
      start: appointment.start,
      reference: appointment.reference,
    },
    browserErrors: errors,
  };
  await mkdir(new URL("test-results/", root), { recursive: true });
  await writeFile(
    new URL("test-results/voice-verification.json", root),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
  if (errors.length) throw Error(errors.join("\n"));
} catch (error) {
  const page = context.pages()[0];
  console.error("Voice test page:", page?.url());
  if (page) {
    console.error(
      (
        await page
          .locator("body")
          .innerText()
          .catch(() => "")
      ).slice(0, 1800),
    );
    await page
      .screenshot({
        path: fileURLToPath(
          new URL("screenshots/voice-test-failure.png", root),
        ),
        fullPage: true,
      })
      .catch(() => {});
  }
  throw error;
} finally {
  await context.close();
}
