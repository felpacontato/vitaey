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
  await expect(page.locator(".office-webgl, .office-webgl-fallback").first()).toBeVisible();

  const apiPill = page.locator(".api-pill");
  await expect(apiPill).toContainText(/API ativa|Radar sem fonte|Conectando|Conta sincronizada/);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBeFalsy();

  const navLabels = await page.locator(".nav-list a").evaluateAll((links) =>
    links.map((link) => link.textContent?.replace(/\s+/g, " ").trim()),
  );
  expect(navLabels).toEqual(["Visão geral", "Currículo", "Vagas", "Candidaturas"]);

  await expect(page.locator(".scene-rail")).toHaveCSS("display", "none");
  await expect(page.locator(".station-gate strong")).toHaveCount(0);
  await expect(page.locator(".station-gate p")).toHaveCount(0);
  await expect(page.locator(".monitor-lock")).toHaveCount(0);

  const stations = [
    { id: "curriculo", label: "Abrir currículo", monitor: "Currículo" },
    { id: "vagas", label: "Abrir radar", monitor: "Radar" },
    { id: "kanban", label: "Abrir pipeline", monitor: "Pipeline" },
  ];

  for (const station of stations) {
    const button = page.locator(`section#${station.id} button.station-access`);
    await expect(button).toHaveText(station.label);
    await expect(button).toHaveAttribute("aria-label", `${station.label} no monitor ${station.monitor}`);

    const introBox = await page.locator(`section#${station.id} > .section-intro`).evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        height: style.height,
        opacity: style.opacity,
        overflow: style.overflow,
        pointerEvents: style.pointerEvents,
        width: style.width,
      };
    });
    expect(introBox).toEqual({
      height: "1px",
      opacity: "0",
      overflow: "hidden",
      pointerEvents: "none",
      width: "1px",
    });
  }

  if (testInfo.project.name === "mobile") {
    await expect(page.locator(".opportunity-console")).toHaveCount(0);
    await expect(page.locator("section#vagas button.station-access")).toBeVisible();
    expect(messages.filter((message) => !isIgnoredConsoleMessage(message))).toEqual([]);
    return;
  }

  await page.getByRole("button", { name: "Ver lembretes" }).click();
  await expect(page.locator(".auth-notice")).toContainText("Nenhum lembrete pendente agora.");
  await expect(page.locator("section#vagas h2")).toContainText("Vagas recomendadas");
  await expect(page.locator("section#curriculo h2").first()).toContainText("Curr");

  const detailsPanel = page.locator(".details-panel");
  const demoContent = /NuvemLabs|ContaVerde|HealthSync|Product Designer Pleno|UX Researcher|Product Manager/;
  const initialBodyText = (await page.locator("body").textContent()) ?? "";
  for (const demoText of ["NuvemLabs", "ContaVerde", "HealthSync", "Product Designer Pleno", "UX Researcher", "Product Manager"]) {
    expect(initialBodyText).not.toContain(demoText);
  }
  await expect(page.locator(".opportunity-console")).toHaveCount(0);
  await expect(page.locator("section#vagas button.station-access")).toBeVisible();

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
    const submittedBodyText = (await page.locator("body").textContent()) ?? "";
    for (const demoText of ["NuvemLabs", "ContaVerde", "HealthSync", "Product Designer Pleno", "UX Researcher", "Product Manager"]) {
      expect(submittedBodyText).not.toContain(demoText);
    }
  } else {
    await expect(page.locator(".auth-notice")).toContainText(/Entre com Google|Nenhum lembrete/);
  }

  expect(messages.filter((message) => !isIgnoredConsoleMessage(message))).toEqual([]);
});

test("opens the matching workspace from each monitor button", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Desktop covers station-to-monitor interaction.");
  test.setTimeout(90_000);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; } .boot-overlay { display: none !important; }" });

  const stations = [
    { id: "curriculo", button: "Abrir currículo", workspace: ".profile-workbench" },
    { id: "vagas", button: "Abrir radar", workspace: ".opportunity-console" },
    { id: "kanban", button: "Abrir pipeline", workspace: ".kanban-grid" },
  ];

  for (const station of stations) {
    await expect(page.locator(`section#${station.id} button.station-access`)).toHaveText(station.button);
    await page.locator(`section#${station.id} button.station-access`).evaluate((button) => {
      if (button instanceof HTMLButtonElement) button.click();
    });
    await expect(page.locator(`[data-station-workspace="${station.id}"]`)).toBeVisible();
    await expect(page.locator(`[data-station-workspace="${station.id}"] ${station.workspace}`)).toHaveCount(1);
  }
});

function isIgnoredConsoleMessage(message: string) {
  return (
    message.includes("Failed to load resource") ||
    message.includes("GL Driver Message") ||
    message.includes("THREE.Clock: This module has been deprecated")
  );
}
