import { test, expect } from "@playwright/test";
test("starting text chat focuses the visible composer", async ({
  page,
}, testInfo) => {
  await page.goto("/app/agent");
  await page
    .getByRole("button", { name: "Start text conversation", exact: true })
    .click();
  const input = page.getByRole("textbox", {
    name: "Message receptionist",
    exact: true,
  });
  await expect(input).toBeFocused();
  if (testInfo.project.name === "mobile")
    await expect
      .poll(async () => {
        const box = await input.boundingBox();
        return box.y >= 0 && box.y + box.height <= page.viewportSize().height;
      })
      .toBe(true);
});
test("typing works immediately and the main controls are readable", async ({
  page,
}) => {
  await page.goto("/app/agent");
  const input = page.getByRole("textbox", {
    name: "Message receptionist",
    exact: true,
  });
  await expect(input).toBeEnabled();
  await input.fill("What services do you offer?");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("log")).toContainText("Therapy session");
  const sizes = await page
    .locator(".message p")
    .evaluateAll((nodes) =>
      nodes.map((node) => parseFloat(getComputedStyle(node).fontSize)),
    );
  expect(sizes.every((size) => size >= 14)).toBe(true);
  await expect(
    page.getByRole("button", { name: "Start voice conversation", exact: true }),
  ).toBeVisible();
});
test("suggested prompts start a real saved conversation", async ({ page }) => {
  await page.goto("/app/agent");
  await page
    .getByRole("button", { name: "What services do you offer?", exact: true })
    .click();
  await expect(page.getByRole("log")).toContainText("Therapy session");
  const messages = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("voicely.demo.v1"))
        .conversations.filter((c) => !c.sample)
        .at(-1).messages,
  );
  expect(
    messages.some(
      (m) => m.role === "customer" && m.text === "What services do you offer?",
    ),
  ).toBe(true);
});
test("a stalled native recognizer shows an actionable fallback rather than Listening", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.SpeechRecognition = class {
      start() {}
      stop() {}
      abort() {}
    };
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        cancel() {},
        resume() {},
        getVoices() {
          return [];
        },
        speak(utterance) {
          setTimeout(() => utterance.onend?.(), 0);
        },
      },
      configurable: true,
    });
  });
  await page.goto("/app/agent");
  await page
    .getByRole("combobox", { name: "Speech recognition engine", exact: true })
    .selectOption("browser");
  await page
    .getByRole("button", { name: "Start voice conversation", exact: true })
    .click();
  await expect(page.locator(".voice-stage .badge")).toHaveText("Connecting");
  await expect(page.getByRole("alert")).toContainText("did not start", {
    timeout: 12000,
  });
  await expect(
    page.getByRole("button", { name: /Switch to on-device voice/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Message receptionist", exact: true }),
  ).toBeEnabled();
});
test("the native voice conversation resumes listening and ignores duplicate final events", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.SpeechRecognition = class {
      constructor() {
        window.__voicelyRecognition = this;
      }
      start() {
        setTimeout(() => this.onstart?.(), 0);
      }
      stop() {}
      abort() {}
    };
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        cancel() {},
        resume() {},
        getVoices() {
          return [];
        },
        speak(utterance) {
          setTimeout(() => utterance.onend?.(), 0);
        },
      },
      configurable: true,
    });
  });
  await page.goto("/app/agent");
  await page
    .getByRole("combobox", { name: "Speech recognition engine", exact: true })
    .selectOption("browser");
  await page
    .getByRole("button", { name: "Start voice conversation", exact: true })
    .click();
  await expect(page.locator(".voice-stage .badge")).toHaveText("Listening");
  await page.evaluate(() => {
    const callback = window.__voicelyRecognition.onresult;
    const final = Object.assign(
      [{ transcript: "What services do you offer?" }],
      { isFinal: true },
    );
    callback({ resultIndex: 0, results: [final] });
    callback({ resultIndex: 0, results: [final] });
  });
  await expect(page.getByRole("log")).toContainText("Therapy session");
  await expect(page.locator(".voice-stage .badge")).toHaveText("Listening");
  const count = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("voicely.demo.v1"))
        .conversations.filter((c) => !c.sample)
        .at(-1)
        .messages.filter((m) => m.role === "customer").length,
  );
  expect(count).toBe(1);
  await page
    .getByRole("button", { name: "End conversation", exact: true })
    .click();
  await expect(page.locator(".voice-stage .badge")).toHaveText("Ready");
});
