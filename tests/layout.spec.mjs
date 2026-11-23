import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";

async function startLocalGame(page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Estate", level: 1 })).toBeVisible();
  await expect(page.locator(".entry-card > .eyebrow")).toHaveCount(0);
  const start = page.getByRole("button", { name: "Start new game" });
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.locator(".board .space")).toHaveCount(40);
}

test("desktop board occupies the left 70%, stays fixed, and keeps tiles readable", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await startLocalGame(page);

  const layout = await page.evaluate(() => {
    const box = (selector) => {
      const { x, y, width, height, right, bottom } = document.querySelector(selector).getBoundingClientRect();
      return { x, y, width, height, right, bottom };
    };
    return {
      stage: box(".main-stage"),
      board: box(".board"),
      sidebar: box(".sidebar"),
      title: box(".sidebar .topbar h1"),
      tile: box(".space"),
      tileFont: parseFloat(getComputedStyle(document.querySelector(".space-name")).fontSize),
      viewportHeight: innerHeight,
      viewportWidth: innerWidth,
      sidebarOverflow: getComputedStyle(document.querySelector(".sidebar")).overflowY,
    };
  });
  console.log("Desktop layout:", JSON.stringify(layout));

  expect(layout.sidebar.x / layout.viewportWidth).toBeCloseTo(0.7, 2);
  expect(layout.sidebar.width / layout.viewportWidth).toBeCloseTo(0.3, 2);
  expect(layout.title.x).toBeGreaterThanOrEqual(layout.sidebar.x);
  expect(layout.stage.right).toBeLessThanOrEqual(layout.sidebar.x);
  expect(layout.board.width).toBeGreaterThan(850);
  expect(layout.board.bottom).toBeLessThanOrEqual(layout.viewportHeight);
  expect(Math.abs(layout.board.width - layout.board.height)).toBeLessThan(2);
  expect(layout.tile.width).toBeGreaterThan(70);
  expect(layout.tileFont).toBeGreaterThanOrEqual(11);
  expect(layout.sidebarOverflow).toBe("auto");
  await expect(page.locator(".sidebar .topbar .eyebrow")).toHaveCount(0);

  const initialY = layout.stage.y;
  await page.locator(".sidebar").evaluate((sidebar) => {
    const extra = document.createElement("div");
    extra.style.height = "1600px";
    extra.setAttribute("data-testid", "scroll-probe");
    sidebar.append(extra);
    sidebar.scrollTop = 600;
  });
  await expect.poll(() => page.locator(".sidebar").evaluate((sidebar) => sidebar.scrollTop)).toBeGreaterThan(500);
  expect((await page.locator(".main-stage").boundingBox()).y).toBeCloseTo(initialY, 1);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.locator("[data-testid=scroll-probe]").evaluate((extra) => extra.remove());
  await page.locator(".sidebar").evaluate((sidebar) => { sidebar.scrollTop = 0; });
  await page.screenshot({ path: testInfo.outputPath("desktop-board.png"), fullPage: true });

  await page.locator(".space").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Property management" }).click();
  await expect(page.getByRole("region", { name: "Property management" })).toBeVisible();
  await page.getByRole("button", { name: "Property management" }).click();
  await expect(page.locator(".board .space")).toHaveCount(40);
});

test("board fits a shorter desktop viewport and narrow screen", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await startLocalGame(page);
  const desktop = await page.evaluate(() => ({
    stage: document.querySelector(".main-stage").getBoundingClientRect().toJSON(),
    sidebar: document.querySelector(".sidebar").getBoundingClientRect().toJSON(),
  }));
  expect(desktop.sidebar.x / 1024).toBeCloseTo(0.7, 2);
  expect(desktop.stage.bottom).toBeLessThanOrEqual(768);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => ({
    stage: document.querySelector(".main-stage").getBoundingClientRect().toJSON(),
    board: document.querySelector(".board").getBoundingClientRect().toJSON(),
    sidebar: document.querySelector(".sidebar").getBoundingClientRect().toJSON(),
    documentWidth: document.documentElement.scrollWidth,
  }));
  console.log("Narrow layout:", JSON.stringify(mobile));
  expect(mobile.board.width).toBeLessThanOrEqual(390);
  expect(mobile.board.height).toBeLessThanOrEqual(844);
  expect(mobile.sidebar.y).toBeGreaterThanOrEqual(mobile.stage.bottom);
  expect(mobile.documentWidth).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath("narrow-board.png"), fullPage: true });
});

test("AGENTS.md records all five layout requests", async () => {
  const instructions = await readFile(new URL("../AGENTS.md", import.meta.url), "utf8");
  for (const phrase of ["no eyebrow", "right information column", "70%", "30%", "scroll that column independently", "readable board tiles"]) {
    expect(instructions).toContain(phrase);
  }
});
