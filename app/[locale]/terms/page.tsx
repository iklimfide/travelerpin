import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { Link } from "@/lib/i18n/navigation";
import { BRAND } from "@/lib/constants";
import { CONTACT_EMAIL } from "@/lib/legal/contact";

const linkClassName = "font-medium text-[#2563eb] hover:text-[#1d4ed8]";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("termsTitle"),
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const t = await getTranslations("legal");
  const brandVars = { brand: BRAND.name, domain: BRAND.domain };

  return (
    <LegalPageShell title={t("termsTitle")}>
      <p>{t("termsIntro", brandVars)}</p>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("termsS1Title")}</h2>
        <p>{t("termsS1Body", brandVars)}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("termsS2Title")}</h2>
        <p>{t("termsS2Body")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("termsS3Title")}</h2>
        <p>{t("termsS3Body")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("termsS4Title")}</h2>
        <p>{t("termsS4Body")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("termsS5Title")}</h2>
        <p>
          {t("termsS5Prefix")}{" "}
          <Link href="/policy" className={linkClassName}>
            {t("termsS5Link")}
          </Link>{" "}
          {t("termsS5Suffix")}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("termsS6Title")}</h2>
        <p>{t("termsS6Body")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("termsS7Title")}</h2>
        <p>{t("termsS7Body")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("termsS8Title")}</h2>
        <p>
          {t("termsS8Prefix")}{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>
            {CONTACT_EMAIL}
          </a>
          {t("termsS8Suffix")}
        </p>
      </section>
    </LegalPageShell>
  );
}
