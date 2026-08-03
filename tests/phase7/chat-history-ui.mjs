import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch();

try {
  const context = await browser.newContext({ viewport: { width: 1_440, height: 900 } });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const composer = page.locator("#message-input");
  await composer.fill("Remember the orange launch is Friday");
  await page.locator("#chat-form").evaluate((form) => form.requestSubmit());
  await page.getByText("Saved reply: Remember the orange launch is Friday", {
    exact: true,
  }).waitFor();

  await page.reload({ waitUntil: "networkidle" });
  const transcript = page.locator("#conversation");
  assert.equal(
    await transcript
      .getByText("Remember the orange launch is Friday", { exact: true })
      .count(),
    1,
    "user message did not survive reload",
  );
  assert.equal(
    await transcript
      .getByText("Saved reply: Remember the orange launch is Friday", { exact: true })
      .count(),
    1,
    "assistant reply did not survive reload",
  );

  await page.locator("#history-search-input").fill("orange Friday");
  await page.locator("#history-search-form").evaluate((form) => form.requestSubmit());
  await page.locator(".history-result").first().waitFor();
  await page.locator(".history-result").first().click();
  await page.locator(".message--target").waitFor();

  page.once("dialog", (dialog) => dialog.accept("Orange launch decisions"));
  await page.getByRole("button", { name: /^Rename / }).first().click();
  await page.getByText("Orange launch decisions", { exact: true }).first().waitFor();

  await page.locator("#reset-button").click();
  await page.locator("#conversation-title-text").getByText("New conversation").waitFor();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".history-item--active .history-item__action").last().click();
  await page.locator("#conversation-title-text").getByText("Orange launch decisions").waitFor();

  assert.deepEqual(browserErrors, [], "desktop history flow emitted browser errors");
  await context.close();

  const mobileContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const mobile = await mobileContext.newPage();
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  await mobile.locator("#history-button").click();
  assert.equal(
    await mobile.locator(".agent-panel").evaluate((element) =>
      element.classList.contains("agent-panel--open"),
    ),
    true,
    "mobile history drawer did not open",
  );
  await mobile.locator("#history-close").click();
  assert.equal(
    await mobile.locator(".agent-panel").evaluate((element) =>
      element.classList.contains("agent-panel--open"),
    ),
    false,
    "mobile history drawer did not close",
  );
  await mobileContext.close();
} finally {
  await browser.close();
}

console.log("Chat history browser checks passed.");
