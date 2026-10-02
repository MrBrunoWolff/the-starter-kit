export function frameworkFiles(framework, name, navigation, date) {
  const page = (component) =>
    `import { ${component} } from '../components/sample-pages';\nexport default ${component};\n`;
  const rootImports = `import { themeInit } from '../theme-init';\nimport font400 from '@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff2?url';\nimport font500 from '@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2?url';\nimport fontCss400 from '@fontsource/space-grotesk/latin-400.css?inline';\nimport fontCss500 from '@fontsource/space-grotesk/latin-500.css?inline';\nimport fontCss700 from '@fontsource/space-grotesk/latin-700.css?inline';\n`;
  const shell = navigation ? "AppShell" : "BaseShell";
  const files = {};
  if (framework === "vinext") {
    Object.assign(files, {
      "vite.config.ts": `import { defineConfig } from 'vite';\nimport vinext from 'vinext';\nimport { cloudflare } from '@cloudflare/vite-plugin';\nimport tailwindcss from '@tailwindcss/vite';\nexport default defineConfig({\n  resolve: { dedupe: ['react', 'react-dom'] },\n  plugins: [tailwindcss(), vinext(), cloudflare({ viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] } })],\n});\n`,
      "cloudflare.config.ts": `import { defineConfig } from 'cf/config';\nexport default defineConfig({\n  worker: {\n    name: ${JSON.stringify(name)},\n    entrypoint: 'vinext/server/app-router-entry',\n    compatibilityDate: '${date}',\n    compatibilityFlags: ['nodejs_compat'],\n    assets: { notFoundHandling: 'none' },\n    observability: { enabled: true, logs: { enabled: true }, traces: { enabled: true, headSamplingRate: 0.01 } },\n  },\n});\n`,
      "next.config.ts": `import type { NextConfig } from 'next';\nexport default {} satisfies NextConfig;\n`,
      "src/app/layout.tsx": `import type { ReactNode } from 'react';\nimport type { Metadata } from 'next';\nimport { ${shell} } from '../components/${navigation ? "app-shell" : "base-shell"}';\n${rootImports}import appCss from '../styles/globals.css?inline';\nexport const metadata: Metadata = { title: ${JSON.stringify(name)}, description: 'Built for the web. Ready for the edge.', manifest: '/manifest.webmanifest', icons: { icon: '/favicon.svg', apple: '/icons/apple-touch-icon.png' }, appleWebApp: { capable: true, title: 'Starter' } };\nexport default function RootLayout({ children }: { children: ReactNode }) {\n  return <html lang="en" suppressHydrationWarning><head><style dangerouslySetInnerHTML={{ __html: [appCss, fontCss400, fontCss500, fontCss700].join("\\n") }} /><script dangerouslySetInnerHTML={{ __html: themeInit }} /><meta name="theme-color" content="#fafafa" /><link rel="preload" href={font400} as="font" type="font/woff2" crossOrigin="anonymous" /><link rel="preload" href={font500} as="font" type="font/woff2" crossOrigin="anonymous" /></head><body><${shell}>{children}</${shell}></body></html>;\n}\n`,
      "src/app/page.tsx": page("Page1"),
    });
    if (navigation) {
      files["src/app/page-2/page.tsx"] = page("Page2").replace("../components", "../../components");
      files["src/app/page-3/page.tsx"] = page("Page3").replace("../components", "../../components");
      files["src/router-adapter.tsx"] =
        `"use client";\nimport NextLink from 'next/link';\nimport { usePathname, useRouter } from 'next/navigation';\nimport type { ComponentProps } from 'react';\nexport function Link(props: ComponentProps<'a'> & { href: string }) { return <NextLink {...props} />; }\nexport function useAppRouter() {\n  const pathname = usePathname();\n  const router = useRouter();\n  return { pathname, push: (href: string) => router.push(href) };\n}\n`;
    }
  } else {
    Object.assign(files, {
      "vite.config.ts": `import { defineConfig } from 'vite';\nimport { cloudflare } from '@cloudflare/vite-plugin';\nimport { tanstackStart } from '@tanstack/react-start/plugin/vite';\nimport react from '@vitejs/plugin-react';\nimport tailwindcss from '@tailwindcss/vite';\nexport default defineConfig({ plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), tanstackStart(), react(), tailwindcss()] });\n`,
      "wrangler.jsonc":
        JSON.stringify(
          {
            $schema: "node_modules/wrangler/config-schema.json",
            name,
            main: "@tanstack/react-start/server-entry",
            compatibility_date: date,
            compatibility_flags: ["nodejs_compat"],
            observability: {
              enabled: true,
              logs: { enabled: true },
              traces: { enabled: true, head_sampling_rate: 0.01 },
            },
          },
          null,
          2,
        ) + "\n",
      "src/client.tsx": `// Load hydration immediately through a small bootstrap, keeping it out of the\n// parser-discovered module graph that competes with first-paint fonts.\nvoid Promise.all([\n  import('react'),\n  import('react-dom/client'),\n  import('@tanstack/react-start/client'),\n]).then(([{ createElement, StrictMode, startTransition }, { hydrateRoot }, { StartClient }]) => {\n  startTransition(() => {\n    hydrateRoot(document, createElement(StrictMode, null, createElement(StartClient)));\n  });\n});\n`,
      "src/router.tsx": `import { createRouter } from '@tanstack/react-router';\nimport { routeTree } from './routeTree.gen';\nexport function getRouter() {\n  return createRouter({ routeTree, defaultPreload: 'intent', scrollRestoration: true });\n}\ndeclare module '@tanstack/react-router' {\n  interface Register { router: ReturnType<typeof getRouter> }\n}\n`,
      "src/routes/__root.tsx": `import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';\nimport type { ReactNode } from 'react';\nimport { ${shell} } from '../components/${navigation ? "app-shell" : "base-shell"}';\n${rootImports}import appCss from '../styles/globals.css?inline';\nexport const Route = createRootRoute({\n  head: () => ({ meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }, { title: ${JSON.stringify(name)} }, { name: 'description', content: 'Built for the web. Ready for the edge.' }], links: [{ rel: 'icon', href: '/favicon.svg' }, { rel: 'manifest', href: '/manifest.webmanifest' }, { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' }] }),\n  shellComponent: RootDocument,\n});\nfunction RootDocument({ children }: { children: ReactNode }) {\n  return <html lang="en" suppressHydrationWarning><head><style dangerouslySetInnerHTML={{ __html: [appCss, fontCss400, fontCss500, fontCss700].join("\\n") }} /><script dangerouslySetInnerHTML={{ __html: themeInit }} /><meta name="theme-color" content="#fafafa" /><link rel="preload" href={font400} as="font" type="font/woff2" crossOrigin="anonymous" /><link rel="preload" href={font500} as="font" type="font/woff2" crossOrigin="anonymous" /><HeadContent /></head><body><${shell}>{children}</${shell}><Scripts /></body></html>;\n}\n`,
      "src/routes/index.tsx": `import { createFileRoute } from '@tanstack/react-router';\nimport { Page1 } from '../components/sample-pages';\nexport const Route = createFileRoute('/')({ component: Page1 });\n`,
    });
    if (navigation) {
      for (const [path, component] of [
        ["page-2", "Page2"],
        ["page-3", "Page3"],
      ])
        files[`src/routes/${path}.tsx`] =
          `import { createFileRoute } from '@tanstack/react-router';\nimport { ${component} } from '../components/sample-pages';\nexport const Route = createFileRoute('/${path}')({ component: ${component} });\n`;
      files["src/router-adapter.tsx"] =
        `import { Link as RouterLink, useRouter, useRouterState } from '@tanstack/react-router';\nimport type { ComponentProps } from 'react';\nexport function Link({ href, ...props }: ComponentProps<'a'> & { href: string }) { return <RouterLink to={href} {...props} />; }\nexport function useAppRouter() {\n  const pathname = useRouterState({ select: (state) => state.location.pathname });\n  const router = useRouter();\n  return { pathname, push: (href: string) => { void router.navigate({ to: href }); } };\n}\n`;
    }
  }
  return files;
}
