import { test, expect, type Locator } from "@playwright/test";
import { openImportedLab } from "./imported-helpers";

function contrast(a: string, b: string) {
  const luminance = (s: string) => {
    const rgb = s.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((c) => {
      const v = c / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const values = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (values[1] + 0.05) / (values[0] + 0.05);
}
async function color(el: Locator, property = "color") {
  return el.evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), property);
}

test("light is the default on dark devices and an explicit theme preserves presentation values", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1536, height: 864 });
  await page.goto("/");
  const shell = page.locator(".app-shell");
  await expect(shell).toHaveCSS("background-color", "rgb(255, 255, 255)");
  const toggle = page.getByRole("button", { name: "Toggle dark mode" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(shell).toHaveCSS("background-color", "rgb(23, 26, 31)");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(shell).toHaveCSS("background-color", "rgb(23, 26, 31)");
  expect(contrast(await color(page.locator("h1")), await color(shell, "background-color"))).toBeGreaterThan(7);
  const begin = page.getByRole("button", { name: "Explore the junction", exact: true });
  expect(contrast(await color(begin), await color(begin, "background-color"))).toBeGreaterThan(7);
  await begin.click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("slider").fill("5");
  await expect(page.locator("output")).toHaveText("5.00 V");
  const card = page.locator('[data-profile="field"]');
  const background = await color(card, "background-color");
  expect(contrast(await color(card.locator(".profile-line"), "stroke"), background)).toBeGreaterThan(4.5);
  expect(contrast(await color(card.locator(".graph-ticks"), "fill"), background)).toBeGreaterThan(4.5);
  expect(contrast(await color(page.locator(".full-equations")), await color(shell, "background-color"))).toBeGreaterThan(7);
  await page.getByRole("button", { name: "Model & sources" }).click();
  const details = page.getByLabel("Model assumptions and sources");
  expect(contrast(await color(details.locator("p").first()), await color(details, "background-color"))).toBeGreaterThan(4.5);
  await page.getByRole("button", { name: "Close model details" }).click();
  for (const theme of ["light", "dark"] as const) {
    await toggle.click();
    await expect(shell).toHaveCSS("background-color", theme === "dark" ? "rgb(23, 26, 31)" : "rgb(255, 255, 255)");
    await expect(page.locator("output")).toHaveText("5.00 V");
    await expect(page.locator(".lesson-dashboard")).toHaveAttribute("data-voltage", "5");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.body.scrollWidth)).toBe(390);
  await page.reload();
  await expect(shell).toHaveCSS("background-color", "rgb(23, 26, 31)");
  await toggle.click();
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(shell).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("lab materials, instrument displays and controls follow live theme changes without resetting the circuit", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  const f = await openImportedLab(page);
  await expect(f.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await f.getByRole("button", { name: "A tiny one", exact: true }).click();
  await f.getByRole("button", { name: "Bring the ammeter", exact: true }).click();
  await f.getByRole("button", { name: "Next", exact: true }).click();
  await f.getByRole("button", { name: "Wire it for me", exact: true }).click();
  await f.locator('[data-r="supply"]').fill("40");
  await expect(f.locator('[data-r="i"]')).toHaveText("26.6 pA");
  const instrument = () => f.locator("body").evaluate(() => {
    const { lab } = (window as any).__present;
    const supply = lab.bench.view.scene.children.find((o: any) => o.userData.part === "supply");
    const display = supply.children.find((o: any) => o.material?.map);
    const pixel = display.material.map.image.getContext("2d").getImageData(0, 0, 1, 1).data;
    return { face: supply.children[0].material.color.getHexString(), pixel: Array.from(pixel).slice(0, 3), wires: lab.state.wires.length };
  });
  for (const theme of ["dark", "light", "dark"] as const) {
    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect.poll(async () => (await instrument()).face).toBe(theme === "dark" ? "22272f" : "ffffff");
    expect((await instrument()).pixel).toEqual(theme === "dark" ? [21, 26, 33] : [242, 242, 242]);
    expect((await instrument()).wires).toBe(3);
    await expect(f.locator('[data-r="i"]')).toHaveText("26.6 pA");
    const tool = f.locator('[data-tool="wire"]');
    expect(contrast(await color(tool.locator("span")), await color(tool, "background-color"))).toBeGreaterThan(4.5);
  }
  expect(errors).toEqual([]);
});

test("reading figures and equations adapt to both themes while retaining reader state", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Read as a page", exact: true }).click();
  const f = page.frameLocator("iframe");
  await expect(f.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(f.locator(".katex")).not.toHaveCount(0);
  await f.locator('.toc a[href="#graded"]').click();
  await f.locator("#gvr").fill("5");
  for (const theme of ["dark", "light", "dark"] as const) {
    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(f.locator("body")).toHaveCSS("background-color", theme === "dark" ? "rgb(23, 26, 31)" : "rgb(255, 255, 255)");
    await expect(f.locator("#gvr-out")).toHaveText("5.00 V");
    const svg = f.locator("#fig-g-plots"), surface = f.locator("#fig-g-plots").locator("..");
    const text = svg.locator("text").first();
    expect(contrast(await color(text, "fill"), await color(surface, "background-color"))).toBeGreaterThan(4.5);
    expect(await f.locator("body").evaluate(() => document.body.scrollWidth)).toBe(390);
  }
  await expect(f.locator("body")).not.toContainText("Physics code and 130 automated tests");
  expect(errors).toEqual([]);
});
