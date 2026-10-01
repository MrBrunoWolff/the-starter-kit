export const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/labs", label: "Labs" },
  { href: "/about", label: "About" },
] as const;
export type NavRoute = (typeof NAV_ITEMS)[number]["href"];
