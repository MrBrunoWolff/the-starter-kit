"use client";

import { Link, useAppRouter } from "../router-adapter";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePageTransition } from "./page-transition";
import { ThemeSwitch } from "./theme-switch";
import { NAV_ITEMS, type NavRoute } from "../navigation-items";

const normalizePath = (p?: string | null) => {
  if (!p) return "/";
  return p.replace(/\/+$/, "") || "/";
};

type Geometry = { left: number; width: number };

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const sameGeometry = (a: Geometry[] | null, b: Geometry[]) =>
  a !== null &&
  a.length === b.length &&
  a.every((g, i) => g.left === b[i]?.left && g.width === b[i]?.width);

export const Navigation = () => {
  const { pathname } = useAppRouter();
  const { startTransition, isTransitioning } = usePageTransition();

  /*
   * `usePathname` does not commit until the route transition resolves — about
   * 280ms after a click. Driving the underline off it alone leaves the
   * indicator frozen for that whole window, so `pendingRoute` records the
   * clicked destination and the underline moves on the next frame.
   */
  const [pendingRoute, setPendingRoute] = useState<NavRoute | null>(null);
  const [seenPathname, setSeenPathname] = useState(pathname);
  /*
   * Geometry for every link, not just the active one, so a navigation is a
   * pure state read: no getBoundingClientRect and no layout pass per route
   * change. Only a real layout change (font swap, resize) re-measures.
   */
  const [geometries, setGeometries] = useState<Geometry[] | null>(null);
  const [ready, setReady] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  // Both resets adjust state during render rather than in an effect, so there
  // is no intermediate commit and the bar never paints a frame pointing
  // somewhere it should already have left.
  if (pathname !== seenPathname) {
    setSeenPathname(pathname);
    setPendingRoute(null);
  } else if (pendingRoute !== null && !isTransitioning) {
    /*
     * Self-healing. The provider can drop a startTransition that arrives
     * mid-transition, and pressing Back inside the fade-out window lands on a
     * route that is not the pending one. In both cases nothing is running, so
     * the optimistic guess is stale — without this the bar either sticks on a
     * page we are not on, or takes two hops to arrive.
     */
    setPendingRoute(null);
  }

  const activePath = normalizePath(pathname);
  const indicatedIndex = NAV_ITEMS.findIndex((item) => item.href === (pendingRoute ?? activePath));
  const indicated = indicatedIndex < 0 ? null : geometries?.[indicatedIndex];

  useIsomorphicLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const measure = () => {
      const navBox = nav.getBoundingClientRect();
      // getBoundingClientRect is a border-box read, but absolutely positioned
      // children lay out against the padding box. clientLeft is 0 today and
      // stays correct the day someone gives <nav> a border.
      const originX = navBox.left + nav.clientLeft;
      const next = NAV_ITEMS.map((_, index) => {
        const link = linkRefs.current[index];
        if (!link) return { left: 0, width: 0 };
        const box = link.getBoundingClientRect();
        // .nav-link pads itself out to enlarge the hit target and pulls the
        // space back with a negative margin, so the underline tracks the text.
        const style = getComputedStyle(link);
        const padLeft = Number.parseFloat(style.paddingLeft) || 0;
        const padRight = Number.parseFloat(style.paddingRight) || 0;
        return {
          left: box.left - originX + padLeft,
          width: Math.max(0, box.width - padLeft - padRight),
        };
      });
      // ResizeObserver fires once immediately on observe(), and fonts.ready
      // resolves synchronously when the font is cached, so identical
      // re-measures are the common case — bail rather than commit the same
      // inline styles.
      setGeometries((prev) => (sameGeometry(prev, next) ? prev : next));
    };

    measure();

    let cancelled = false;
    // Webfonts load with `display: swap`, so the first measurement can land on
    // fallback metrics.
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  // Transitions stay off until a frame after the first measurement lands, so
  // the measured bar snaps into position instead of sliding in from zero width.
  // The CSS fallback underline covers the same frames and is switched off by
  // `data-ready`, so the handover is invisible.
  useEffect(() => {
    if (!geometries || ready) return;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, [geometries, ready]);

  const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, url: NavRoute) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (activePath === url) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    // The provider drops a startTransition that arrives mid-transition, so do
    // not claim a pending route the navigation is not going to honour.
    if (isTransitioning) return;
    setPendingRoute(url);
    startTransition(url);
  };

  return (
    <>
      {/* Always top-right, at every width. */}
      <div className="theme-switch-slot">
        <ThemeSwitch />
      </div>

      {/* Top-right on desktop, bottom-centre on mobile. Same DOM either way. */}
      <header className="main-navigation">
        <nav aria-label="Primary" ref={navRef} data-ready={ready ? "" : undefined}>
          {NAV_ITEMS.map((item, index) => {
            const isActive = activePath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                // Braces matter: in React 19 a ref callback's return value is
                // taken as its cleanup, so a concise arrow body would hand
                // React the anchor element as a callback.
                ref={(node) => {
                  linkRefs.current[index] = node;
                }}
                className={`nav-link ${isActive ? "nav-link-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={(e) => handleNavigation(e, item.href)}
              >
                {item.label}
              </Link>
            );
          })}
          <span
            aria-hidden
            className="nav-underline"
            style={
              indicated
                ? {
                    translate: `${indicated.left}px 0`,
                    width: `${indicated.width}px`,
                    opacity: 1,
                  }
                : { opacity: 0 }
            }
          />
        </nav>
      </header>
    </>
  );
};
