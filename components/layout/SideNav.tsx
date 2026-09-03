"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";

/** Wordmark placeholder: the "o" is the dotCMS magenta dot. */
function Wordmark() {
  return (
    <span className="text-2xl tracking-tight text-white">
      d<span className="text-brand-magenta">o</span>t
      <span className="font-bold">cms</span>
    </span>
  );
}

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[314px] shrink-0 flex-col bg-brand-navy lg:flex">
      <Link href="/" className="flex h-[89px] shrink-0 items-center px-8">
        <Wordmark />
      </Link>

      <nav className="flex flex-col">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`mx-4 border-b border-brand-line px-4 py-2.5 text-[17px] transition-colors ${
                isActive ? "text-white" : "text-white/90 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
