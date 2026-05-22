import { expect, test } from "@playwright/test";

test("renders production radar without demo data", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const messages: string[] = [];
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      messages.push(`${msg.type()}: ${msg.text()}`);
    }
  });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; } .boot-overlay { display: none !important; }" });
  await expect(page.locator("h1")).toContainText("Vitaey");
  await expect(page.locator(".hero-copy h2")).toContainText("VITAEY");

  const apiPill = page.locator(".api-pill");
  await expect(apiPill).toContainText(/API ativa|Radar sem fonte|Conectando|Conta sincronizada/);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBeFalsy();

  await page.getByRole("button", { name: "Ver lembretes" }).click();
  await expect(page.locator(".auth-notice")).toContainText("Nenhum lembrete pendente agora.");
  await expect(page.locator("section#vagas h2")).toContainText("Vagas recomendadas");
  await expect(page.locator("section#curriculo h2").first()).toContainText("Curr");

  const detailsPanel = page.locator(".details-panel");
  const demoContent = /NuvemLabs|ContaVerde|HealthSync|Product Designer Pleno|UX Researcher|Product Manager/;
  for (const demoText of ["NuvemLabs", "ContaVerde", "HealthSync", "Product Designer Pleno", "UX Researcher", "Product Manager"]) {
    await expect(page.getByText(demoText, { exact: false })).toHaveCount(0);
  }
  await expect(page.locator(".opportunity-console")).toHaveCount(0);
  await expect(page.locator("section#vagas button.station-access")).toBeVisible();

  if (testInfo.project.name === "mobile") {
    expect(messages.filter((message) => !isIgnoredConsoleMessage(message))).toEqual([]);
    return;
  }

  await page.locator("section#vagas button.station-access").evaluate((button) => {
    if (button instanceof HTMLButtonElement) button.click();
  });
  await expect(page.locator('[data-station-workspace="vagas"]')).toBeVisible();
  await expect(page.locator(".opportunity-console")).toBeVisible();

  const jobCount = await page.locator(".job-card").count();
  if (jobCount === 0) {
    const openedText = (await page.locator("body").textContent()) ?? "";
    expect(openedText).toContain("Nenhuma vaga");
    expect(openedText).toContain("Nenhuma vaga selecionada");
    expect(openedText).toContain("As etapas aparecem quando");
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
    for (const demoText of ["NuvemLabs", "ContaVerde", "HealthSync", "Product Designer Pleno", "UX Researcher", "Product Manager"]) {
      await expect(page.getByText(demoText, { exact: false })).toHaveCount(0);
    }
  } else {
    await expect(page.locator(".auth-notice")).toContainText(/Entre com Google|Nenhum lembrete/);
  }

  expect(messages.filter((message) => !isIgnoredConsoleMessage(message))).toEqual([]);
});

function isIgnoredConsoleMessage(message: string) {
  return (
    message.includes("Failed to load resource") ||
    message.includes("GL Driver Message") ||
    message.includes("THREE.Clock: This module has been deprecated")
  );
}
