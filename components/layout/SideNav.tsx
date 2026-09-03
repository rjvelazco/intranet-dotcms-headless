"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/dotcms";

/** Wordmark placeholder: the "o" is the dotCMS magenta dot. */
function Wordmark() {
  return (
    <span className="text-2xl tracking-tight text-white">
      d<span className="text-brand-magenta">o</span>t
      <span className="font-bold">cms</span>
    </span>
  );
}

export function SideNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[314px] shrink-0 flex-col bg-brand-navy lg:flex">
      <Link href="/" className="flex h-[89px] shrink-0 items-center px-8">
        <Wordmark />
      </Link>

      <nav className="flex flex-col">
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.dotcmsHref}
              href={item.href}
              target={item.target === "_blank" ? "_blank" : undefined}
              aria-current={isActive ? "page" : undefined}
              className={`mx-4 border-b border-brand-line px-4 py-2.5 text-[17px] transition-colors ${
                isActive ? "text-white" : "text-white/90 hover:text-white"
              }`}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
