---
name: pwa-readiness
description: Maintain or verify the starter PWA manifest, icons, service worker, offline fallback, and update behavior. Use for installability and offline changes, independently of Lighthouse stable scores.
---

# PWA readiness

The starter uses public/manifest.webmanifest, public/sw.js, public/offline.html, and the PwaRuntime component. Registration runs only in production and after load. Verify the same behavior with vinext and TanStack Start.

Keep the app name, short name, icon paths, theme color, and start URL current. Ordinary icons are 192 and 512 pixels; the maskable icon needs an opaque background with its mark inside the safe zone. Apple uses the 180px icon. Match the launch background to the theme-color default.

Keep navigation network-first with an offline fallback; never cache account HTML, API responses, or remote data by default. Increment the cache version after changing precached resources. Activation may delete only this app's own cache prefix. Allow updates to wait until existing tabs close; do not force reloads during user input.

Test a production preview in a secure context: fetch every manifest icon, await service-worker activation, reload to become controlled, go offline, and navigate to a new route. Confirm the offline page appears and API requests fail rather than returning cached data. Restore the network and confirm normal navigation. Follow https://web.dev/articles/add-manifest and https://web.dev/articles/service-worker-lifecycle for current browser behavior.
