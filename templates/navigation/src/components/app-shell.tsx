"use client";
import type { ReactNode } from "react";
import { Navigation } from "./navigation";
import { TransitionProvider, MainContentTransition } from "./page-transition";
import { PwaRuntime } from "./pwa-runtime";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PwaRuntime />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <TransitionProvider>
        <Navigation />
        <main id="main-content" tabIndex={-1}>
          <MainContentTransition>{children}</MainContentTransition>
        </main>
      </TransitionProvider>
    </>
  );
}
