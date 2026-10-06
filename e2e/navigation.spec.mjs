import { test, expect } from "@playwright/test";

// Font readiness resolves before React commits the underline's remeasurement.
// Wait for the actual layout, then require two identical captures. Keep the
// cross-framework comparison exact: no masks, pixel tolerances, or retries of
// the comparison itself.
async function stableScreenshot(page) {
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const active = document.querySelector('nav a[aria-current="page"]');
          const underline = document.querySelector(".nav-underline");
          const linkBox = active.getBoundingClientRect();
          const barBox = underline.getBoundingClientRect();
          const style = getComputedStyle(active);
          const left = parseFloat(style.paddingLeft);
          const right = parseFloat(style.paddingRight);
          return (
            Math.abs(barBox.left - linkBox.left - left) < 0.02 &&
            Math.abs(barBox.width - linkBox.width + left + right) < 0.02
          );
        }),
      { message: "Navigation must use the loaded font metrics" },
    )
    .toBe(true);
  let previous;
  await expect
    .poll(
      async () => {
        const current = await page.screenshot({ animations: "disabled" });
        const stable = previous?.equals(current) ?? false;
        previous = current;
        return stable;
      },
      { message: "Page pixels must settle before framework comparison", intervals: [100] },
    )
    .toBe(true);
  return previous;
}

for (const [framework, port] of [
  ["vinext", 4411],
  ["tanstack-start", 4412],
]) {
  for (const mobile of [false, true]) {
    test(`${framework}: ${mobile ? "mobile" : "desktop"} navigation and theme`, async ({
      page,
    }) => {
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      );
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`http://localhost:${port}`);
      await expect(page.locator("nav")).toHaveAttribute("data-ready", "");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page 1");
      const box = await page.locator(".main-navigation").boundingBox();
      expect(mobile ? box.y > 740 : box.y < 30).toBe(true);
      const colors = await page.evaluate(() => [
        getComputedStyle(document.documentElement).backgroundColor,
        getComputedStyle(document.querySelector(".main-navigation")).backgroundColor,
      ]);
      expect(colors[0]).toBe(colors[1]);
      await page.getByRole("link", { name: "Page 2", exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page 2");
      await expect(page.locator(".page-transition")).toHaveClass(/fade-in/);
      await expect(page.locator(".page-transition")).toHaveCSS("opacity", "1");
      await page.getByRole("link", { name: "Page 3", exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page 3");
      await page.goBack();
      await expect(page.getByRole("link", { name: "Page 2", exact: true })).toHaveAttribute(
        "aria-current",
        "page",
      );
      if (mobile) {
        await expect(page.locator(".page-transition")).toHaveClass(/fade-in/);
        await page.evaluate(() => {
          const target = document.querySelector(".page-transition");
          const touch = (clientX) => new Touch({ identifier: 1, target, clientX, clientY: 300 });
          for (const [type, x] of [
            ["touchstart", 250],
            ["touchmove", 100],
            ["touchend", 100],
          ]) {
            const point = touch(x);
            target.dispatchEvent(
              new TouchEvent(type, {
                bubbles: true,
                touches: type === "touchend" ? [] : [point],
                targetTouches: type === "touchend" ? [] : [point],
                changedTouches: [point],
              }),
            );
          }
        });
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page 3");
      }
      await page.getByRole("button", { name: /Theme:/ }).click();
      await page.getByRole("button", { name: /Theme:/ }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      expect(errors).toEqual([]);
    });
  }
  test(`${framework}: cached routes swap while hidden and enter smoothly`, async ({ page }) => {
    await page.goto(`http://localhost:${port}/page-2`);
    await expect(page.locator("nav")).toHaveAttribute("data-ready", "");
    await page.getByRole("link", { name: "Page 1", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page 1");
    await expect(page.locator(".page-transition")).toHaveCSS("opacity", "1");
    await expect(page.locator(".page-transition")).not.toHaveClass(/entering/);
    const samples = await page.evaluate(async () => {
      const wrapper = document.querySelector(".page-transition");
      const frames = [];
      const start = performance.now();
      document.querySelector('nav a[href="/page-2"]').click();
      await new Promise((resolve) => {
        const sample = () => {
          frames.push({
            heading: wrapper.querySelector("h1").textContent,
            phase: wrapper.className,
            opacity: Number(getComputedStyle(wrapper).opacity),
            elapsed: performance.now() - start,
            sameWrapper: wrapper === document.querySelector(".page-transition"),
          });
          if (performance.now() - start < 1200) requestAnimationFrame(sample);
          else resolve();
        };
        requestAnimationFrame(sample);
      });
      return frames;
    });
    expect(samples.every((frame) => frame.sameWrapper)).toBe(true);
    const exit = samples.filter((frame) => frame.phase.includes("fade-out"));
    expect(exit.length).toBeGreaterThan(0);
    expect(exit.every((frame) => frame.heading === "Page 1")).toBe(true);
    const entry = samples.filter((frame) => frame.phase.includes("entering"));
    expect(entry.length).toBeGreaterThan(0);
    expect(entry.every((frame) => frame.heading === "Page 2")).toBe(true);
    expect(entry[0].opacity).toBeLessThan(0.2);
    expect(entry.at(-1).elapsed - entry[0].elapsed).toBeGreaterThan(200);
    expect(samples.at(-1).opacity).toBe(1);
    expect(samples.at(-1).phase).not.toContain("entering");
  });
  test(`${framework}: initial content is visible before hydration`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page 1");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator(".page-transition")).toHaveCSS("opacity", "1");
      await page.getByRole("link", { name: "Page 2", exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page 2");
    } finally {
      await context.close();
    }
  });
  test(`${framework}: reduced motion and modified click`, async ({ playwright }) => {
    // Native windows/tabs need the full browser implementation, rather than
    // the separate headless shell. Keep its window/input state isolated.
    const browser = await playwright.chromium.launch({ channel: "chromium" });
    try {
      const context = await browser.newContext({ reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto(`http://localhost:${port}/page-2`);
      await expect(page.locator("nav")).toHaveAttribute("data-ready", "");
      await page.bringToFront();
      await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(true);
      // Native background tabs may have no opener, so observe the browser context.
      await page.evaluate(() => {
        document.addEventListener(
          "click",
          (event) => {
            window.nativeClick = event;
          },
          { capture: true, once: true },
        );
      });
      // Hold the modifier through the browser's native tab-creation event,
      // rather than restoring keyboard state immediately after mouse dispatch.
      await page.keyboard.down("ControlOrMeta");
      const [opened] = await Promise.all([
        context.waitForEvent("page"),
        (async () => {
          await page.getByRole("link", { name: "Page 3", exact: true }).click();
          const event = await page.evaluate(() => ({
            modified: window.nativeClick.ctrlKey || window.nativeClick.metaKey,
            trusted: window.nativeClick.isTrusted,
            prevented: window.nativeClick.defaultPrevented,
          }));
          expect(event).toEqual({ modified: true, trusted: true, prevented: false });
        })(),
      ]);
      await page.keyboard.up("ControlOrMeta");
      await opened.waitForURL("**/page-3");
      expect(opened.url()).toContain("/page-3");
      expect(page.url()).toContain("/page-2");
      await opened.close();
      await page.getByRole("link", { name: "Page 1", exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page 1");
      await expect(page.locator(".page-transition")).toHaveCSS("animation-name", "none");
    } finally {
      await browser.close();
    }
  });
  test(`${framework}: installable manifest and offline fallback`, async ({ page, context }) => {
    await page.goto(`http://localhost:${port}`);
    const manifest = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      return (await fetch(link.href)).json();
    });
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.goto(`http://localhost:${port}/offline-check`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/offline/i);
    await context.setOffline(false);
  });
}

test("frameworks render identical pixels in both themes at desktop and mobile sizes", async ({
  browser,
}, testInfo) => {
  for (const mobile of [false, true]) {
    for (const dark of [false, true]) {
      const context = await browser.newContext({
        viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        reducedMotion: "reduce",
        colorScheme: dark ? "dark" : "light",
      });
      const pages = await Promise.all([context.newPage(), context.newPage()]);
      const shots = [];
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        // The second framework hydrates against fallback metrics first, so the
        // comparison also exercises fonts completing after nav[data-ready].
        let releaseFont;
        if (i === 1) {
          const blocked = new Promise((resolve) => {
            releaseFont = resolve;
          });
          await page.route("**/*500-normal*.woff2", async (route) => {
            await blocked;
            await route.continue();
          });
        }
        await page.goto(`http://localhost:${4411 + i}`, { waitUntil: "domcontentloaded" });
        await expect(page.locator("nav")).toHaveAttribute("data-ready", "");
        releaseFont?.();
        shots.push(await stableScreenshot(page));
        await testInfo.attach(
          `${i === 0 ? "vinext" : "tanstack"}-${mobile ? "mobile" : "desktop"}-${dark ? "dark" : "light"}`,
          { body: shots[i], contentType: "image/png" },
        );
      }
      expect(shots[0].equals(shots[1])).toBe(true);
      await context.close();
    }
  }
});
