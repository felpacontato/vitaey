import { expect, test } from "@playwright/test";

test.use({ trace: "off" });

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
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; scroll-snap-type: none !important; } .scene-section { scroll-snap-align: none !important; } .boot-overlay { display: none !important; }" });
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
  expect(navLabels).toEqual(["Visão geral", "Currículo", "Radar", "Pipeline", "Integrações", "Perfil", "Sobre"]);

  await expect(page.locator(".scene-rail")).toHaveCSS("display", "none");
  await expect(page.locator(".station-gate strong")).toHaveCount(0);
  await expect(page.locator(".station-gate p")).toHaveCount(0);
  await expect(page.locator(".monitor-lock")).toHaveCount(0);

  const stations = [
    { id: "curriculo", label: "Abrir currículo", monitor: "Currículo" },
    { id: "radar", label: "Abrir radar", monitor: "Radar" },
    { id: "kanban", label: "Abrir pipeline", monitor: "Pipeline" },
    { id: "integracoes", label: "Abrir integrações", monitor: "Integrações" },
    { id: "perfil", label: "Abrir perfil", monitor: "Perfil" },
    { id: "sobre", label: "Abrir sobre nós", monitor: "Sobre" },
  ];

  const stationState = await page.evaluate(() =>
    ["curriculo", "radar", "kanban", "integracoes", "perfil", "sobre"].map((id) => {
      const section = document.getElementById(id);
      const button = section?.querySelector("button.station-access");
      const intro = section?.querySelector(".section-intro");
      const style = intro ? window.getComputedStyle(intro) : null;
      return {
        id,
        aria: button?.getAttribute("aria-label") ?? "",
        label: button?.textContent?.replace(/\s+/g, " ").trim() ?? "",
        introBox: style
          ? {
              height: style.height,
              opacity: style.opacity,
              overflow: style.overflow,
              pointerEvents: style.pointerEvents,
              width: style.width,
            }
          : null,
      };
    }),
  );
  expect(stationState).toEqual(
    stations.map((station) => ({
      id: station.id,
      aria: `${station.label} no monitor ${station.monitor}`,
      label: station.label,
      introBox: {
        height: "1px",
        opacity: "0",
        overflow: "hidden",
        pointerEvents: "none",
        width: "1px",
      },
    })),
  );

  if (testInfo.project.name === "mobile") {
    await expect(page.locator(".opportunity-console")).toHaveCount(0);
    await scrollStationIntoFocus(page, "radar");
    await page.waitForTimeout(180);
    await expect(page.locator("section#radar button.station-access")).toBeVisible();
    expect(messages.filter((message) => !isIgnoredConsoleMessage(message))).toEqual([]);
    return;
  }

  await page.getByRole("button", { name: "Ver lembretes" }).click();
  await expect(page.locator(".auth-notice")).toContainText("Nenhum lembrete pendente agora.");
  await expect(page.locator("section#radar h2")).toContainText("Radar de vagas");
  await expect(page.locator("section#curriculo h2").first()).toContainText("Curr");

  const detailsPanel = page.locator(".details-panel");
  const demoContent = /NuvemLabs|ContaVerde|HealthSync|Product Designer Pleno|UX Researcher|Product Manager/;
  const initialBodyText = (await page.locator("body").textContent()) ?? "";
  for (const demoText of ["NuvemLabs", "ContaVerde", "HealthSync", "Product Designer Pleno", "UX Researcher", "Product Manager"]) {
    expect(initialBodyText).not.toContain(demoText);
  }
  await expect(page.locator(".opportunity-console")).toHaveCount(0);
  await scrollStationIntoFocus(page, "radar");
  await page.waitForTimeout(180);
  await expect(page.locator("section#radar button.station-access")).toBeVisible();

  await page.locator("section#radar button.station-access").evaluate((button) => {
    if (button instanceof HTMLButtonElement) button.click();
  });
  await expect(page.locator('[data-station-workspace="radar"]')).toBeVisible();
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
  test.setTimeout(240_000);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; scroll-snap-type: none !important; } .scene-section { scroll-snap-align: none !important; } .boot-overlay { display: none !important; }" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);

  const stations = [
    { id: "curriculo", button: "Abrir currículo", workspace: ".profile-workbench" },
    { id: "radar", button: "Abrir radar", workspace: ".opportunity-console" },
    { id: "kanban", button: "Abrir pipeline", workspace: ".kanban-grid" },
    { id: "integracoes", button: "Abrir integrações", workspace: ".integrations-workspace" },
    { id: "perfil", button: "Abrir perfil", workspace: ".profile-station" },
    { id: "sobre", button: "Abrir sobre nós", workspace: ".about-workspace" },
  ];

  for (const station of stations) {
    await scrollStationIntoFocus(page, station.id);
    await page.waitForFunction(
      (id) => document.querySelector(`section#${id} .station-gate`)?.classList.contains("is-focused"),
      station.id,
      { timeout: 30_000 },
    );

    const result = await page.evaluate(async ({ id, workspace }) => {
      const button = document.querySelector(`section#${id} button.station-access`);
      const gate = button?.closest(".station-gate");
      const label = button?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      if (button instanceof HTMLButtonElement) button.click();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      return {
        focused: gate?.classList.contains("is-focused") ?? false,
        label,
        workspaceMounted: Boolean(document.querySelector(`[data-station-workspace="${id}"] ${workspace}`)),
      };
    }, { id: station.id, workspace: station.workspace });

    expect(result).toEqual({
      focused: true,
      label: station.button,
      workspaceMounted: true,
    });
    const closed = await page.evaluate(async (id) => {
      const closeButton = document.querySelector(`[data-station-workspace="${id}"] .workspace-dock button`);
      if (closeButton instanceof HTMLButtonElement) closeButton.click();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      return !document.querySelector(`[data-station-workspace="${id}"]`);
    }, station.id);
    expect(closed).toBe(true);
  }
});

test("wheel scroll pauses on each monitor station", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Desktop covers stepped monitor scroll.");
  test.setTimeout(180_000);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.addStyleTag({ content: ".boot-overlay { display: none !important; }" });
  await expect(page.locator(".office-webgl, .office-webgl-fallback").first()).toBeVisible();
  await expect(page.locator(".station-gate")).toHaveCount(6);
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    document.documentElement.style.scrollSnapType = "none";
    window.scrollTo(0, 0);
    window.dispatchEvent(new Event("scroll"));
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    document.documentElement.style.scrollSnapType = "";
    document.documentElement.style.scrollBehavior = "";
  });
  await page.waitForFunction(() => window.scrollY <= 2 && !document.querySelector(".station-gate.is-focused"));
  await page.waitForTimeout(1500);

  const stations = [
    { id: "curriculo", button: "Abrir currículo" },
    { id: "radar", button: "Abrir radar" },
    { id: "kanban", button: "Abrir pipeline" },
    { id: "integracoes", button: "Abrir integrações" },
    { id: "perfil", button: "Abrir perfil" },
    { id: "sobre", button: "Abrir sobre nós" },
  ];

  for (const station of stations) {
    await dispatchStepperWheel(page);
    await expect
      .poll(() => readFocusedStation(page), {
        intervals: [250, 500, 1000],
        timeout: 30_000,
      })
      .toEqual([
        expect.objectContaining({
          className: expect.stringContaining(`station-gate--${station.id}`),
          label: station.button,
        }),
      ]);
  }
});

function readFocusedStation(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll(".station-gate.is-focused")).map((gate) => ({
      className: gate.className,
      label: gate.textContent?.replace(/\s+/g, " ").trim(),
    })),
  );
}

async function dispatchStepperWheel(page: import("@playwright/test").Page) {
  const consumed = await page.evaluate(async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const wasPrevented = !window.dispatchEvent(
        new WheelEvent("wheel", { deltaY: 900, bubbles: true, cancelable: true }),
      );
      if (wasPrevented) return true;
      await new Promise((resolve) => window.setTimeout(resolve, 180));
    }
    return false;
  });

  expect(consumed).toBe(true);
}

async function scrollStationIntoFocus(page: import("@playwright/test").Page, id: string) {
  await page.evaluate((stationId) => {
    const section = document.getElementById(stationId);
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const target = rect.top + window.scrollY + rect.height * 0.5 - window.innerHeight * 0.56;
    window.scrollTo(0, Math.max(0, target));
    window.dispatchEvent(new Event("scroll"));
  }, id);
}

function isIgnoredConsoleMessage(message: string) {
  return (
    message.includes("Failed to load resource") ||
    message.includes("GL Driver Message") ||
    message.includes("THREE.Clock: This module has been deprecated")
  );
}
