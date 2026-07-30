"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const LINKS = [
  { href: "/kamikaze/catalog", label: "Katalog" },
  { href: "/kamikaze/cities", label: "Şehirler" },
  { href: "/kamikaze/parks", label: "Parklar" },
  { href: "/kamikaze/users", label: "Kullanıcılar" },
  { href: "/kamikaze/stats", label: "İstatistik" },
  { href: "/kamikaze/notifications", label: "Bildirim" },
  { href: "/kamikaze/i18n", label: "EN–TR" },
  { href: "/kamikaze/instagram-import", label: "IG import" },
  { href: "/kamikaze/pin-upload", label: "Pin yükle" },
  { href: "/kamikaze/profile-media", label: "Pin foto" },
] as const;

export function KamikazeNav() {
  const pathname = usePathname();
  const linksRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = linksRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLElement>(".yp-nav__link--active");
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [pathname]);

  return (
    <aside className="yp-nav">
      <div className="yp-nav__brand">
        TravelerPin YP
        <span>İç yönetim paneli</span>
      </div>
      <nav ref={linksRef} className="yp-nav__links" aria-label="YP bölümleri">
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
