import { test, expect } from "@playwright/test";

test("complete Inter equations, zoomed equilibrium graphs, and textbook citation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the junction", exact: true })
    .click();
  await expect(page.locator("[data-equation]")).toHaveCount(2);
  await expect(page.locator('[data-profile="field"]')).toHaveCSS(
    "background-color",
    "rgb(245, 245, 247)",
  );
  await expect(page.locator('[data-profile="field"] .profile-line')).toHaveCSS(
    "stroke",
    "rgb(116, 96, 139)",
  );
  await expect(page.locator('[data-profile="field"]')).toHaveAttribute(
    "data-spatial-range-um",
    "0.6",
  );
  await expect(
    page.locator('[data-profile="field"] .graph-ticks'),
  ).toContainText("−4");
  await expect(
    page.locator('[data-equation="width"] .math-fraction'),
  ).toHaveCount(2);
  const style = await page.locator(".full-equations").evaluate((el) => ({
    font: getComputedStyle(el).fontFamily,
    size: parseFloat(getComputedStyle(el).fontSize),
  }));
  expect(style.font).toContain("Inter");
  expect(style.size).toBeGreaterThanOrEqual(20);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Reverse bias");
  await expect(
    page.getByText("Equal doping · abrupt junction · P − / N +", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "Spatial profiles · fixed axes · dashed lines mark depletion edges",
      { exact: true },
    ),
  ).toHaveCount(0);
  await expect(page.locator('[data-profile="field"]')).toHaveAttribute(
    "data-spatial-range-um",
    "2.4",
  );
  await page.getByRole("button", { name: "Model & sources" }).click();
  await expect(page.locator("#model-details")).toContainText(
    "Donald A. Neamen",
  );
  await expect(page.locator("#model-details cite")).toHaveText(
    "Semiconductor Physics and Devices: Basic Principles",
  );
  await expect(page.locator("#model-details")).toContainText("Fourth Edition");
});

test("wide columns, graded charge placement and breakdown quadrants respond at 1440px", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the junction", exact: true })
    .click();
  for (const width of [1439, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const stage of [0, 1, 2, 3]) {
      await page.locator(".stage-track button").nth(stage).click();
      const b = await page.evaluate(() => {
        const r = (s: string) => {
          const x = document.querySelector(s)?.getBoundingClientRect();
          return x
            ? { left: x.left, right: x.right, top: x.top, bottom: x.bottom }
            : null;
        };
        return {
          copy: r(".lesson-copy"),
          iso: r(".substrate"),
          charge: r('[data-profile="charge"]'),
          field: r('[data-profile="field"]'),
          potential: r('[data-profile="potential"]'),
          mechanism: r(".breakdown-card"),
          note: r(".mechanism-note"),
          footer: r(".footer"),
        };
      });
      if (width < 1440) {
        await expect(page.locator(".graded-charge")).toHaveCount(0);
        continue;
      }
      if (stage !== 2) {
        expect(b.field!.left).toBeGreaterThan(b.copy!.right);
        expect(b.iso!.left).toBeGreaterThan(b.copy!.right - 12);
        expect(b.iso!.right).toBeLessThan(b.field!.left + 12);
      }
      if (stage === 3) {
        await expect(
          page.locator('.graded-charge [data-profile="charge"]'),
        ).toBeVisible();
        expect(b.charge!.right).toBeLessThan(b.field!.left);
        expect(b.field!.bottom).toBeLessThan(b.potential!.top);
      }
      if (stage === 2) {
        expect(b.mechanism!.left).toBeGreaterThan(b.copy!.right);
        expect(b.iso!.top).toBeGreaterThan(b.copy!.bottom);
        expect(b.mechanism!.bottom).toBeLessThan(b.note!.top);
        expect(b.iso!.bottom).toBeLessThan(b.footer!.top);
      }
    }
  }
});

test("Zener electron tunnels at constant energy and avalanche branches 1 → 2 → 4 → 8", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore the junction", exact: true })
    .click();
  await page.locator(".stage-track button").nth(2).click();
  // Freeze the same animation time in both views and count active conduction electrons.
  for (const [phase, count] of [
    [0.15, 1],
    [0.35, 2],
    [0.6, 4],
    [0.82, 8],
  ]) {
    for (const view of [".breakdown-card", ".breakdown-carriers"]) {
      const visible = await page
        .locator(`${view} .avalanche-electron`)
        .evaluateAll((els, phase) => {
          for (const el of els)
            for (const a of el.getAnimations()) {
              a.pause();
              a.currentTime = phase * 6000;
            }
          return els.filter((el) => Number(getComputedStyle(el).opacity) > 0.5)
            .length;
        }, phase);
      expect(visible).toBe(count);
    }
  }
  await page
    .getByRole("button", { name: "Zener tunneling", exact: true })
    .click();
  await expect(page.locator(".breakdown-card")).toHaveCSS(
    "background-color",
    "rgb(32, 32, 32)",
  );
  await expect(page.locator(".tunnel-path")).not.toHaveAttribute(
    "marker-end",
    /.+/,
  );
  const fade = await page
    .locator(".breakdown-card linearGradient stop")
    .evaluateAll((els) => els.map((el) => el.getAttribute("stop-opacity")));
  expect(fade).toEqual(["0", "1", "1", "0"]);
  const electronY = Number(
    await page.locator(".tunneling-electron").getAttribute("cy"),
  );
  const positions = await page.locator(".tunnel-path").evaluate((el) => {
    const p = el as SVGPathElement;
    const a = p.getPointAtLength(0),
      b = p.getPointAtLength(p.getTotalLength());
    return { dy: b.y - a.y, dx: b.x - a.x, y: a.y };
  });
  expect(positions.dy).toBe(0);
  expect(positions.dx).toBeGreaterThanOrEqual(100);
  expect(positions.y).toBeGreaterThan(electronY);
  const dash = await page.locator(".tunnel-path").evaluate((el) => {
    const a = el.getAnimations()[0];
    a.pause();
    a.currentTime = 100;
    const before = parseFloat(getComputedStyle(el).strokeDashoffset);
    a.currentTime = 600;
    return {
      before,
      after: parseFloat(getComputedStyle(el).strokeDashoffset),
      iterations: a.effect!.getTiming().iterations,
    };
  });
  expect(dash.after).toBeLessThan(dash.before);
  expect(dash.iterations).toBe(Infinity);
  const move = await page.locator(".tunneling-electron").evaluate((el) => {
    for (const a of el.getAnimations()) {
      a.pause();
      a.currentTime = 2000;
    }
    const m = new DOMMatrix(getComputedStyle(el).transform);
    return { x: m.e, y: m.f };
  });
  expect(move.x).toBeGreaterThan(0);
  expect(move.y).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".tunnel-path")).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(page.locator(".tunneling-electron")).toHaveAttribute(
    "cx",
    "224",
  );
});

test("1536px windows use wide columns regardless of height and equations stay smaller than headings", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [
    [1536, 600],
    [1536, 680],
    [1536, 720],
    [1536, 864],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Explore the junction", exact: true })
      .click();
    for (const stage of [0, 1, 3]) {
      await page.locator(".stage-track button").nth(stage).click();
      await expect(page.locator(".presentation")).toHaveAttribute(
        "data-wide",
        width >= 1440 ? "true" : "false",
      );
      const values = await page.evaluate(() => {
        const heading = document.querySelector("h1")!,
          equations = document.querySelector(".full-equations")!;
        const h = getComputedStyle(heading),
          e = getComputedStyle(equations);
        const copy = document
          .querySelector(".lesson-copy")!
          .getBoundingClientRect();
        const field = document
          .querySelector('[data-profile="field"]')!
          .getBoundingClientRect();
        const cards = [...document.querySelectorAll(".profile-card")].map(
          (el) => el.getBoundingClientRect(),
        );
        return {
          headingSize: h.fontSize,
          equationSize: e.fontSize,
          weight: Number(e.fontWeight),
          copyRight: copy.right,
          fieldLeft: field.left,
          cardBottom: Math.max(...cards.map((r) => r.bottom)),
          footerTop: document.querySelector(".footer")!.getBoundingClientRect()
            .top,
          bodyWidth: document.body.scrollWidth,
        };
      });
      expect(
        parseFloat(values.equationSize) / parseFloat(values.headingSize),
      ).toBeCloseTo(0.76, 4);
      expect(values.weight).toBeGreaterThanOrEqual(600);
      expect(values.bodyWidth).toBe(width);
      expect(values.cardBottom).toBeLessThanOrEqual(values.footerTop);
      if (width >= 1440)
        expect(values.fieldLeft).toBeGreaterThan(values.copyRight);
    }
  }
});
