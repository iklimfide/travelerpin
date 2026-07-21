import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { BRAND } from "@/lib/constants";
import { CONTACT_EMAIL } from "@/lib/legal/contact";

const linkClassName = "font-medium text-[#2563eb] hover:text-[#1d4ed8]";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("imprintTitle"),
    alternates: { canonical: "/imprint" },
  };
}

export default async function ImprintPage() {
  const t = await getTranslations("legal");
  const brandVars = { brand: BRAND.name, domain: BRAND.domain };

  return (
    <LegalPageShell title={t("imprintTitle")}>
      <p>{t("imprintIntro", brandVars)}</p>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("imprintServiceTitle")}</h2>
        <p>{BRAND.name}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("imprintWebsiteTitle")}</h2>
        <p>
          <a href={`https://${BRAND.domain}`} className={linkClassName}>
            {BRAND.domain}
          </a>
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("imprintContactTitle")}</h2>
        <p>
          {t("imprintContactPrefix")}{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("imprintResponsibleTitle")}</h2>
        <p>{t("imprintResponsibleBody", brandVars)}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("imprintLinksTitle")}</h2>
        <p>{t("imprintLinksBody")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("imprintCopyrightTitle")}</h2>
        <p>{t("imprintCopyrightBody", brandVars)}</p>
      </section>
    </LegalPageShell>
  );
}
