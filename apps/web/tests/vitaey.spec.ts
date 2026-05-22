import { expect, test } from "@playwright/test";

test("renders production radar without demo data", async ({ page }) => {
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

  const jobList = page.locator(".job-list");
  const detailsPanel = page.locator(".details-panel");
  const kanban = page.locator("section#kanban");
  const demoContent = /NuvemLabs|ContaVerde|HealthSync|Product Designer Pleno|UX Researcher|Product Manager/;

  await expect(jobList).not.toContainText(demoContent);
  await expect(kanban).not.toContainText(demoContent);

  const jobCount = await page.locator(".job-card").count();
  if (jobCount === 0) {
    await expect(jobList).toContainText("Nenhuma vaga");
    await expect(detailsPanel).toContainText("Nenhuma vaga selecionada");
    await expect(kanban).toContainText("As etapas aparecem quando");
    expect(messages.filter((message) => !isIgnoredConsoleMessage(message))).toEqual([]);
    return;
  }

  await page.locator(".job-card").first().click();
  await expect(detailsPanel.locator("h2")).not.toContainText(demoContent);
  await page.locator(".job-card button.primary").first().click();

  if (await page.locator(".apply-modal").isVisible()) {
    await page.locator(".review-row input").nth(1).check();
    await page.locator(".review-row input").nth(2).check();
    await page.locator(".review-row input").nth(3).check();
    await page.locator(".modal-actions button.primary").click();
    await expect(kanban).not.toContainText(demoContent);
  } else {
    await expect(page.locator(".auth-notice")).toContainText(/Entre com Google|Nenhum lembrete/);
  }

  expect(messages.filter((message) => !isIgnoredConsoleMessage(message))).toEqual([]);
});

function isIgnoredConsoleMessage(message: string) {
  return message.includes("Failed to load resource") || message.includes("GL Driver Message");
}
