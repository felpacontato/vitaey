import { expect, test } from "@playwright/test";

test("filters jobs and completes a reviewed application", async ({ page }, testInfo) => {
  const messages: string[] = [];
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      messages.push(`${msg.type()}: ${msg.text()}`);
    }
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("Vitaey");
  await expect(page.getByRole("heading", { name: "Candidaturas melhores, com menos ruído." })).toBeVisible();
  const apiPill = page.locator(".api-pill");
  await expect(apiPill).toContainText(/API ativa|Fonte indisponível|Conectando|Conta sincronizada/);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBeFalsy();

  const status = await apiPill.textContent();
  if (status?.includes("Fonte indisponível")) {
    await expect(page.locator(".job-list")).toContainText("Nenhuma vaga disponível");
    await expect(page.locator(".details-panel")).toContainText("Nenhuma vaga selecionada");
    await expect(page.locator("#kanban")).toContainText("As etapas aparecem quando você salvar ou iniciar uma candidatura.");
    await expect(page.locator(".job-list")).not.toContainText("NuvemLabs");
    await expect(page.locator(".job-list")).not.toContainText("Product Manager");
    await testInfo.attach("vitaey-empty-state", {
      body: await page.screenshot({ fullPage: false }),
      contentType: "image/png",
    });
    expect(messages.filter((message) => !message.includes("Failed to load resource"))).toEqual([]);
    return;
  }

  await page.locator("select").nth(1).selectOption("PJ");
  await page.locator(".salary-field input").fill("15000");
  await expect(page.locator(".job-list")).toContainText("Product Manager");
  await expect(page.locator(".job-list")).not.toContainText("NuvemLabs");

  await page.locator("button.primary").first().click();
  await page.locator(".review-row input").nth(1).check();
  await page.locator(".review-row input").nth(2).check();
  await page.locator(".review-row input").nth(3).check();
  await page.locator(".modal-actions button.primary").click();
  await expect(page.locator("#kanban")).toContainText("Product Manager");

  await testInfo.attach("vitaey-flow", {
    body: await page.screenshot({ fullPage: false }),
    contentType: "image/png",
  });
  expect(messages.filter((message) => !message.includes("Failed to load resource"))).toEqual([]);
});
