export type NavItem = {
  label: string;
  href: string;
};

/**
 * PLACEHOLDER navigation. Both the side nav and the top nav render this list.
 *
 * Swap it for dotCMS's own navigation when you're ready:
 *
 *   const nav = await client.nav.get("/", { depth: 1 });
 *
 * `client.nav` is already available on the instance in `lib/dotcms.ts`.
 */
export const navItems: NavItem[] = [
  { label: "Support", href: "/" },
  { label: "Policies & Procedures", href: "/policies-procedures" },
  { label: "Knowledge Base", href: "/knowledge-base" },
  { label: "Cloud", href: "/cloud" },
  { label: "Tier 3", href: "/tier-3" },
  { label: "Analytics", href: "/analytics" },
  { label: "Training", href: "/training" },
];
