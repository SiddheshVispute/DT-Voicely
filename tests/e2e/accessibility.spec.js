import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("all six pages have readable contrast, labels and viewport layouts", async ({
  page,
}) => {
  for (const route of [
    "/",
    "/app",
    "/app/agent",
    "/app/appointments",
    "/app/calls",
    "/app/settings",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      `Accessibility: ${route}`,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Horizontal overflow: ${route}`,
    ).toBe(true);
  }
  await page.goto("/app/agent");
  await page
    .getByRole("button", { name: "What services do you offer?", exact: true })
    .click();
  await expect(page.getByRole("log")).toContainText("Therapy session");
  await page.locator(".agent-config summary").click();
  let expanded = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    expanded.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    "Expanded agent settings and transcript",
  ).toEqual([]);
  await page.goto("/app/appointments");
  await page
    .getByRole("button", { name: /Details for/ })
    .first()
    .click();
  expanded = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    expanded.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    "Appointment dialog and SMS preview",
  ).toEqual([]);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  expanded = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    expanded.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    "Calendar view",
  ).toEqual([]);
});
