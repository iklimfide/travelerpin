"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/kamikaze/catalog", label: "Katalog" },
  { href: "/kamikaze/cities", label: "Şehirler" },
  { href: "/kamikaze/parks", label: "Parklar" },
  { href: "/kamikaze/users", label: "Kullanıcılar" },
  { href: "/kamikaze/stats", label: "İstatistikler" },
  { href: "/kamikaze/notifications", label: "Bildirim gönder" },
  { href: "/kamikaze/i18n", label: "EN–TR" },
] as const;

export function KamikazeNav() {
  const pathname = usePathname();

  return (
    <aside className="yp-nav">
      <div className="yp-nav__brand">
        TravelerPin YP
        <span>İç yönetim paneli</span>
      </div>
      <nav className="yp-nav__links" aria-label="YP bölümleri">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className={`yp-nav__link${active ? " yp-nav__link--active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
