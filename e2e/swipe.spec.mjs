import { expect, test } from "@playwright/test";

for (const [framework, port] of [
  ["vinext", 4411],
  ["tanstack-start", 4412],
]) {
  const PREFIX = framework;
  const START_URL = `http://localhost:${port}/page-2`;
  const SOURCE_HEADING = "Page 2";
  const DIRECTIONS = [
    [-1, "left", "Page 3"],
    [1, "right", "Page 1"],
  ];
  for (const [sign, label, destination] of DIRECTIONS) {
    test(`${PREFIX} swipe ${label} continues from the finger and crosses the full page`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(START_URL);
      await expect(page.locator("nav")).toHaveAttribute("data-ready", "");
      await expect(page.locator(".page-transition")).not.toHaveClass(/entering/);
      const result = await page.evaluate(
        async ({ sign }) => {
          const wrapper = document.querySelector(".page-transition");
          const frame = () => ({
            phase: wrapper.className,
            x: new DOMMatrixReadOnly(getComputedStyle(wrapper).transform).m41,
            width: wrapper.getBoundingClientRect().width,
            heading: [...wrapper.querySelectorAll("h1")].find((heading) =>
              heading.checkVisibility(),
            ).textContent,
          });
          const touch = (type, x) => {
            const point = new Touch({ identifier: 1, target: wrapper, clientX: x, clientY: 300 });
            wrapper.dispatchEvent(
              new TouchEvent(type, {
                bubbles: true,
                touches: type === "touchend" ? [] : [point],
                targetTouches: type === "touchend" ? [] : [point],
                changedTouches: [point],
              }),
            );
          };
          touch("touchstart", 200);
          await new Promise((resolve) => requestAnimationFrame(resolve));
          touch("touchmove", 200 + sign * 150);
          await new Promise((resolve) => requestAnimationFrame(resolve));
          await new Promise((resolve) => requestAnimationFrame(resolve));
          const before = frame();
          touch("touchend", 200 + sign * 150);
          const frames = [];
          const start = performance.now();
          await new Promise((resolve) => {
            const sample = () => {
              frames.push(frame());
              if (performance.now() - start < 1200) requestAnimationFrame(sample);
              else resolve();
            };
            requestAnimationFrame(sample);
          });
          return { before, frames };
        },
        { sign },
      );
      expect(result.before.x * sign).toBeGreaterThan(100);
      const exit = result.frames.filter((frame) => frame.phase.includes("slide-out"));
      expect(exit.length).toBeGreaterThan(3);
      expect(exit.every((frame) => frame.heading === SOURCE_HEADING)).toBe(true);
      // A release must continue from the actual drag, never reverse toward 32px.
      expect(exit[0].x * sign).toBeGreaterThanOrEqual(result.before.x * sign - 2);
      for (let i = 1; i < exit.length; i++) {
        expect((exit[i].x - exit[i - 1].x) * sign).toBeGreaterThanOrEqual(-1);
      }
      expect(exit.at(-1).x * sign).toBeGreaterThan(result.before.width * 0.9);
      const entry = result.frames.filter((frame) => frame.phase.includes("entering"));
      expect(entry.length).toBeGreaterThan(3);
      expect(entry.every((frame) => frame.heading === destination)).toBe(true);
      expect(entry[0].x * -sign).toBeGreaterThan(result.before.width * 0.8);
      expect(Math.abs(result.frames.at(-1).x)).toBeLessThan(1);
      expect(result.frames.at(-1).heading).toBe(destination);
    });
  }

  for (const endType of ["touchend", "touchcancel"]) {
    test(`${PREFIX} ${endType} returns an uncommitted drag smoothly`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(START_URL);
      await expect(page.locator("nav")).toHaveAttribute("data-ready", "");
      const frames = await page.evaluate(
        async ({ endType }) => {
          const wrapper = document.querySelector(".page-transition");
          const touch = (type, x) => {
            const point = new Touch({ identifier: 1, target: wrapper, clientX: x, clientY: 300 });
            const ended = type === "touchend" || type === "touchcancel";
            wrapper.dispatchEvent(
              new TouchEvent(type, {
                bubbles: true,
                touches: ended ? [] : [point],
                targetTouches: ended ? [] : [point],
                changedTouches: [point],
              }),
            );
          };
          touch("touchstart", 200);
          await new Promise((resolve) => requestAnimationFrame(resolve));
          touch("touchmove", 180);
          await new Promise((resolve) => requestAnimationFrame(resolve));
          await new Promise((resolve) => requestAnimationFrame(resolve));
          touch(endType, 180);
          const frames = [];
          const start = performance.now();
          await new Promise((resolve) => {
            const sample = () => {
              frames.push(new DOMMatrixReadOnly(getComputedStyle(wrapper).transform).m41);
              if (performance.now() - start < 350) requestAnimationFrame(sample);
              else resolve();
            };
            requestAnimationFrame(sample);
          });
          return frames;
        },
        { endType },
      );
      expect(frames[0]).toBeLessThan(-10);
      expect(frames.some((x) => x > -15 && x < -2)).toBe(true);
      expect(Math.abs(frames.at(-1))).toBeLessThan(1);
      expect(page.url()).toContain(START_URL);
    });
  }
}
