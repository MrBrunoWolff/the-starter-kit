"use client";

import { useAppRouter } from "../router-adapter";
import { NAV_ITEMS } from "../navigation-items";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useTransition,
} from "react";

type Direction = "left" | "right" | "fade";
type Phase = "idle" | "fadeOut";

/*
 * Four contexts rather than one object, so a consumer that only reads
 * `isTransitioning` does not re-render when the direction changes.
 */
const StartTransitionContext = createContext<((url: string, direction?: Direction) => void) | null>(
  null,
);
const IsTransitioningContext = createContext(false);
const TransitionPhaseContext = createContext<Phase>("idle");
const TransitionDirectionContext = createContext<Direction>("fade");

interface TransitionState {
  isTransitioning: boolean;
  transitionPhase: Phase;
  transitionDirection: Direction;
}

type TransitionAction = { type: "start"; direction: Direction } | { type: "reset" };

/** Swipe order on touch devices. Must match the nav's item order. */
const ROUTES: string[] = NAV_ITEMS.map((item) => item.href);

function transitionReducer(state: TransitionState, action: TransitionAction): TransitionState {
  switch (action.type) {
    case "start":
      return {
        isTransitioning: true,
        transitionPhase: "fadeOut",
        transitionDirection: action.direction,
      };
    case "reset":
      return { isTransitioning: false, transitionPhase: "idle", transitionDirection: "fade" };
    default:
      return state;
  }
}

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useAppRouter();
  const { pathname } = router;
  const [transitionState, dispatchTransition] = useReducer(transitionReducer, {
    isTransitioning: false,
    transitionPhase: "idle",
    transitionDirection: "fade",
  });
  const { isTransitioning, transitionPhase, transitionDirection } = transitionState;
  const [, startReactTransition] = useTransition();
  const pendingUrlRef = useRef<string | null>(null);
  const resetTimeoutRef = useRef<number | null>(null);
  const pathnameRef = useRef(pathname);
  const isTransitioningRef = useRef(isTransitioning);
  // When the exit animation started and how long it runs. The route can resolve
  // before the animation finishes, so the reset has to know what is still owed.
  const exitStartedAtRef = useRef(0);
  const exitDurationRef = useRef(0);

  /*
   * Stable so StartTransitionContext's value keeps its identity across renders.
   * Everything it reads is a ref, the reducer's dispatch, useTransition's start
   * function or the router — read live state through the refs, never directly, or
   * the memoized closure will see a stale value.
   */
  const startTransition = useCallback(
    (url: string, direction: Direction = "fade") => {
      if (pathnameRef.current === url || isTransitioningRef.current) return;

      if (resetTimeoutRef.current) {
        window.clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }

      isTransitioningRef.current = true;
      pendingUrlRef.current = url;
      dispatchTransition({ type: "start", direction });

      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : direction === "fade"
          ? 150
          : 250;
      exitDurationRef.current = duration;
      exitStartedAtRef.current = performance.now();

      /*
       * The navigation starts in the same tick as the fade, not after it. Putting
       * it behind `setTimeout(..., duration)` serialises two independent things —
       * the exit animation runs on the compositor while the RSC payload is
       * fetched — and adds a full `duration` of dead time to every navigation.
       *
       * The visual sequence is unchanged: React keeps the current UI on screen
       * until the new route is ready, and the reset below refuses to fire before
       * the exit animation has played out, so content still swaps while the
       * wrapper is fully faded rather than mid-fade.
       */
      startReactTransition(() => {
        router.push(url);
      });

      resetTimeoutRef.current = window.setTimeout(() => {
        dispatchTransition({ type: "reset" });
        pendingUrlRef.current = null;
        resetTimeoutRef.current = null;
      }, duration + 1200);
    },
    [router],
  );

  useEffect(() => {
    pathnameRef.current = pathname;
    isTransitioningRef.current = isTransitioning;
  }, [pathname, isTransitioning]);

  useEffect(() => {
    if (!isTransitioning || pendingUrlRef.current !== pathname) return;

    // Keep the deadline until the visual reset actually commits. Back navigation
    // can cancel the frame/timer below after the destination route resolves.
    const finish = () => {
      if (resetTimeoutRef.current) {
        window.clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
      isTransitioningRef.current = false;
      dispatchTransition({ type: "reset" });
      pendingUrlRef.current = null;
    };

    // Resetting now would swap content mid-fade and then fade it back in — a
    // visible flicker. A prefetched route routinely resolves inside the window.
    const remaining = exitDurationRef.current - (performance.now() - exitStartedAtRef.current);

    if (remaining > 0) {
      const timeoutId = window.setTimeout(finish, remaining);
      return () => window.clearTimeout(timeoutId);
    }

    const rafId = window.requestAnimationFrame(finish);
    return () => window.cancelAnimationFrame(rafId);
  }, [pathname, isTransitioning]);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) window.clearTimeout(resetTimeoutRef.current);
    };
  }, []);

  return (
    <StartTransitionContext.Provider value={startTransition}>
      <IsTransitioningContext.Provider value={isTransitioning}>
        <TransitionPhaseContext.Provider value={transitionPhase}>
          <TransitionDirectionContext.Provider value={transitionDirection}>
            {children}
          </TransitionDirectionContext.Provider>
        </TransitionPhaseContext.Provider>
      </IsTransitioningContext.Provider>
    </StartTransitionContext.Provider>
  );
}

export function MainContentTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useAppRouter();
  const { startTransition, isTransitioning, transitionPhase, transitionDirection } =
    usePageTransition();
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);
  const swipeAxisRef = useRef<"horizontal" | "vertical" | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const resetTouchState = () => {
    setSwipeOffset(0);
    touchStartRef.current = null;
    touchEndRef.current = null;
    touchStartYRef.current = null;
    touchEndYRef.current = null;
    swipeAxisRef.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isTransitioning || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (
      (e.target as HTMLElement).closest(
        "input, textarea, select, button, a, [contenteditable], [data-no-swipe]",
      )
    )
      return;
    const touch = e.targetTouches[0];
    if (!touch) return;
    touchEndRef.current = null;
    touchEndYRef.current = null;
    touchStartRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    swipeAxisRef.current = null;
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const touchStart = touchStartRef.current;
    const touchStartY = touchStartYRef.current;
    const touch = e.targetTouches[0];
    if (touchStart === null || touchStartY === null || isTransitioning || !touch) return;

    touchEndRef.current = touch.clientX;
    touchEndYRef.current = touch.clientY;

    const distanceX = touchStart - touch.clientX;
    const absX = Math.abs(distanceX);
    const absY = Math.abs(touchStartY - touch.clientY);

    if (swipeAxisRef.current === null) {
      // Lock the axis once the gesture has committed to one, so a vertical
      // scroll never drags the page sideways.
      const lockThreshold = 8;
      if (absX < lockThreshold && absY < lockThreshold) return;
      swipeAxisRef.current = absX > absY ? "horizontal" : "vertical";
    }

    if (swipeAxisRef.current !== "horizontal") {
      setSwipeOffset(0);
      return;
    }

    const maxOffset = Math.min(absX / window.innerWidth, 0.3);
    setSwipeOffset(distanceX > 0 ? -maxOffset : maxOffset);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const touchStart = touchStartRef.current;
    const touchEnd = touchEndRef.current ?? e.changedTouches[0]?.clientX ?? null;
    const touchStartY = touchStartYRef.current;
    const touchEndY = touchEndYRef.current ?? e.changedTouches[0]?.clientY ?? null;
    const swipeAxis = swipeAxisRef.current;

    if (
      touchStart === null ||
      touchEnd === null ||
      touchStartY === null ||
      touchEndY === null ||
      swipeAxis !== "horizontal"
    ) {
      resetTouchState();
      return;
    }

    const distanceX = touchStart - touchEnd;
    const absX = Math.abs(distanceX);
    const absY = Math.abs(touchStartY - touchEndY);

    if (absY >= absX) {
      resetTouchState();
      return;
    }

    const swipeThreshold = 35;
    const isLeftSwipe = distanceX > swipeThreshold;
    const isRightSwipe = distanceX < -swipeThreshold;

    resetTouchState();

    if (!isLeftSwipe && !isRightSwipe) return;
    const currentIndex = ROUTES.indexOf(pathname);
    if (currentIndex === -1) return;

    const nextIndex = isLeftSwipe
      ? (currentIndex + 1) % ROUTES.length
      : (currentIndex - 1 + ROUTES.length) % ROUTES.length;
    const next = ROUTES[nextIndex];
    if (next) startTransition(next, isLeftSwipe ? "right" : "left");
  };

  const touchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: resetTouchState,
  };

  const transitionClass = () => {
    if (transitionDirection === "fade") {
      return transitionPhase === "fadeOut" ? "fade-out" : "fade-in";
    }
    if (transitionPhase === "fadeOut") {
      return transitionDirection === "left" ? "slide-out-left" : "slide-out-right";
    }
    return transitionDirection === "left" ? "slide-in-left" : "slide-in-right";
  };

  if (transitionPhase === "fadeOut") {
    return (
      <div className={`page-transition ${transitionClass()}`} {...touchHandlers}>
        {children}
      </div>
    );
  }

  // No transition while the finger is down, or the rubber-band lags the drag.
  const swipeStyle =
    swipeOffset === 0 ? {} : { transform: `translateX(${swipeOffset * 100}%)`, transition: "none" };

  return (
    <div
      className={`page-transition ${transitionClass()}`}
      style={swipeStyle}
      suppressHydrationWarning
      {...touchHandlers}
    >
      {children}
    </div>
  );
}

export function usePageTransition() {
  const startTransition = use(StartTransitionContext);
  const isTransitioning = use(IsTransitioningContext);
  const transitionPhase = use(TransitionPhaseContext);
  const transitionDirection = use(TransitionDirectionContext);
  if (!startTransition) {
    throw new Error("usePageTransition must be used within TransitionProvider");
  }
  return { startTransition, isTransitioning, transitionPhase, transitionDirection };
}
