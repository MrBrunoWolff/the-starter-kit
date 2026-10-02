export const NAV_ITEMS = [
  { href: "/", label: "Page 1" },
  { href: "/page-2", label: "Page 2" },
  { href: "/page-3", label: "Page 3" },
] as const;
export type NavRoute = (typeof NAV_ITEMS)[number]["href"];
