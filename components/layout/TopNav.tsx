"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/dotcms";

export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <header className="flex h-[89px] shrink-0 items-center border-b border-brand-border bg-white px-4">
      <nav className="flex items-center gap-1 overflow-x-auto">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.dotcmsHref}
              href={item.href}
              target={item.target === "_blank" ? "_blank" : undefined}
              aria-current={isActive ? "page" : undefined}
              className={`shrink-0 rounded px-3 py-1.5 text-[15px] transition-colors ${
                isActive
                  ? "bg-brand-pill text-brand-blue-muted"
                  : "text-brand-blue hover:bg-brand-pill/60"
              }`}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
