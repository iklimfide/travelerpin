import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireKamikazeMaster } from "@/lib/kamikaze/auth";
import { KamikazeNav } from "@/components/kamikaze/KamikazeNav";
import "@/components/kamikaze/kamikaze.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "YP · TravelerPin Yönetim",
};

export default async function KamikazeLayout({ children }: { children: ReactNode }) {
  await requireKamikazeMaster();

  return (
    <div className="yp-shell">
      <KamikazeNav />
      <main className="yp-main">{children}</main>
    </div>
  );
}
