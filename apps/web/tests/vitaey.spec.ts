import { expect, test } from "@playwright/test";

test("filters jobs and completes a reviewed application", async ({ page }) => {
  test.setTimeout(90_000);
  const messages: string[] = [];
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      messages.push(`${msg.type()}: ${msg.text()}`);
    }
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
  await expect(page.locator("h1")).toContainText("Vitaey");
  await expect(page.locator(".hero-copy h2")).toContainText("VITAEY");
  const apiPill = page.locator(".api-pill");
  await expect(apiPill).toContainText(/API ativa|Radar sem fonte|Conectando|Conta sincronizada/);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBeFalsy();

  await expect(page.locator(".boot-overlay")).toHaveClass(/is-hidden/);
  await page.getByRole("button", { name: "Ver lembretes" }).click();
  await expect(page.locator(".auth-notice")).toContainText("Nenhum lembrete pendente agora.");
  await page.getByRole("link", { name: /Explorar vagas/ }).click();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("#vagas");
  await page.getByRole("link", { name: /Revisar/ }).click();
  await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("#curriculo");

  const status = await apiPill.textContent();
  if (status?.includes("Radar sem fonte")) {
    const jobListText = await page.locator(".job-list").textContent();
    const detailsText = await page.locator(".details-panel").textContent();
    const kanbanText = await page.locator("section#kanban").textContent();
    expect(jobListText ?? "").toContain("Nenhuma vaga disponível");
    expect(detailsText ?? "").toContain("Nenhuma vaga selecionada");
    expect(kanbanText ?? "").toContain("As etapas aparecem quando você salvar ou iniciar uma candidatura.");
    expect(jobListText ?? "").not.toContain("NuvemLabs");
    expect(jobListText ?? "").not.toContain("Product Manager");
    expect(messages.filter((message) => !isIgnoredConsoleMessage(message))).toEqual([]);
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
  await expect(page.locator("section#kanban")).toContainText("Product Manager");

  expect(messages.filter((message) => !isIgnoredConsoleMessage(message))).toEqual([]);
});

function isIgnoredConsoleMessage(message: string) {
  return message.includes("Failed to load resource") || message.includes("GL Driver Message");
}
