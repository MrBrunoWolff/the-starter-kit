"use client";
import type { ReactNode } from "react";
import { ThemeSwitch } from "./theme-switch";
import { PwaRuntime } from "./pwa-runtime";

export function BaseShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PwaRuntime />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="theme-switch-slot">
        <ThemeSwitch />
      </div>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
