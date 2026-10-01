"use client";

import { useSyncExternalStore } from "react";

type Theme = "system" | "light" | "dark";
const eventName = "starter-theme-change";
function getTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return value === "dark" || value === "light" ? value : "system";
}
function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== "starter-theme" && event.key !== null) return;
    const value = event.newValue;
    if (value === "dark" || value === "light") document.documentElement.dataset.theme = value;
    else delete document.documentElement.dataset.theme;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", onStorage);
  };
}
const serverTheme = (): Theme => "system";

export function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribe, getTheme, serverTheme);
  const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  function cycle() {
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("starter-theme", next);
    } catch {
      /* Theme still works in memory. */
    }
    window.dispatchEvent(new Event(eventName));
  }
  return (
    <button
      type="button"
      className="theme-switch"
      aria-label={`Theme: ${theme}. Switch to ${next}`}
      title={`Theme: ${theme}`}
      onClick={cycle}
    >
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </svg>
    </button>
  );
}
