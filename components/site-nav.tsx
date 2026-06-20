"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Map as MapIcon } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/spread", label: "Spread Map", icon: MapIcon }
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[2000] border-b border-white/60 bg-white/70 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-3 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
            VL
          </span>
          <span className="text-base font-semibold tracking-tight text-slate-950">
            Viral Lense
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
