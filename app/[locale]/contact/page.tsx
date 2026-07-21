import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { BRAND } from "@/lib/constants";
import { CONTACT_EMAIL } from "@/lib/legal/contact";

const linkClassName = "text-lg font-medium text-[#2563eb] hover:text-[#1d4ed8]";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("contactTitle"),
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const t = await getTranslations("legal");
  const brandVars = { brand: BRAND.name };

  return (
    <LegalPageShell title={t("contactTitle")}>
      <p>{t("contactIntro")}</p>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("contactEmailLabel")}</h2>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("contactWhatToIncludeTitle")}</h2>
        <p>{t("contactWhatToIncludeBody", brandVars)}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("contactResponseTitle")}</h2>
        <p>{t("contactResponseBody")}</p>
      </section>
    </LegalPageShell>
  );
}
