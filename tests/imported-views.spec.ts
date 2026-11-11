import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

test("header places lab left, presentation centered, and reading right without our old brand", async ({
  page,
}) => {
  for (const width of [390, 1536]) {
    await page.setViewportSize({ width, height: 864 });
    await page.goto("/");
    await expect(page.locator(".brand")).toHaveCount(0);
    const b = await page.evaluate(() => {
      const r = (s: string) => {
        const b = document.querySelector(s)!.getBoundingClientRect();
        return {
          left: b.left,
          right: b.right,
          center: (b.left + b.right) / 2,
          top: b.top,
        };
      };
      return {
        lab: r(".lab-button"),
        nav: r(".header-nav"),
        read: r(".read-button"),
      };
    });
    expect(b.lab.left).toBeLessThan(b.read.left);
    expect(b.nav.center).toBeCloseTo(width / 2, 0);
    if (width > 760) {
      expect(b.lab.right).toBeLessThan(b.nav.left);
      expect(b.nav.right).toBeLessThan(b.read.left);
    }
  }
  await page
    .getByRole("button", { name: "The explanation", exact: true })
    .click();
  await page.locator(".stage-track button").nth(3).click();
  await page.getByRole("button", { name: "Laboratory", exact: true }).click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    /embedded=lab&scene=5/,
  );
  await page
    .getByRole("button", { name: "The explanation", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText("The equilibrium junction");
});

test("the reader omits recap and keeps figures, equations and open lab working locally", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("requestfailed", (r) => failures.push(r.url()));
  await page.setViewportSize({ width: 1536, height: 864 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Read as a page", exact: true })
    .click();
  const f = page.frameLocator('iframe[title="Read as a page"]');
  await expect(f.locator(".katex")).not.toHaveCount(0);
  await expect(f.locator("#stage-eq canvas")).toHaveCount(1);
  await expect(f.locator("main > section")).toHaveCount(6);
  await f.locator('.toc a[href="#graded"]').click();
  await expect(f.locator("#gvr")).toBeVisible();
  await f.locator("#gvr").fill("5");
  await expect(f.locator("#gvr-out")).toHaveText("5.00 V");
  await expect(f.locator('#recap, #quiz, .toc a[href="#recap"]')).toHaveCount(0);
  await f.locator('.toc a[href="#open-lab"]').click();
  await f.locator('#lab-open [data-r="auto"]').click();
  await expect(f.locator('#lab-open [data-r="supply"]')).toBeEnabled();
  expect(failures).toEqual([]);
  await f.locator(".top .logo").click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator("h1")).toContainText("Effect of Reverse Bias");
});

test("unchanged styling, rendering and physics modules match the uploaded source", () => {
  const manifest = JSON.parse(
    readFileSync("docs/teammate-source.json", "utf8"),
  );
  const hash = (s: Buffer) => createHash("sha256").update(s).digest("hex");
  for (const [name, sha] of Object.entries(manifest.exactFiles))
    expect(hash(readFileSync(`public/teammate/${name}`))).toBe(sha);
});
