import { expect, type Page } from "@playwright/test";
export async function openImportedLab(page: Page) {
  await page.setViewportSize({ width: 1536, height: 864 });
  await page.goto("/");
  await page.getByRole("button", { name: "Laboratory", exact: true }).click();
  const frame = page.frameLocator('iframe[title="Question and laboratory"]');
  await expect(frame.locator('.card-s[data-scene="4"]')).toHaveClass(/on/);
  await expect(frame.locator('[data-r="supply"]')).toBeEnabled();
  return frame;
}
