import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { BRAND } from "@/lib/constants";
import { CONTACT_EMAIL } from "@/lib/legal/contact";

const linkClassName = "font-medium text-[#2563eb] hover:text-[#1d4ed8]";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("policyTitle"),
    alternates: { canonical: "/policy" },
  };
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("legal");
  const brandVars = { brand: BRAND.name, domain: BRAND.domain };

  return (
    <LegalPageShell title={t("policyTitle")}>
      <p>{t("policyIntro", brandVars)}</p>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("policyS1Title")}</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-foreground">{t("policyS1AccountLabel")}</strong>{" "}
            {t("policyS1AccountBody")}
          </li>
          <li>
            <strong className="font-medium text-foreground">{t("policyS1TravelLabel")}</strong>{" "}
            {t("policyS1TravelBody")}
          </li>
          <li>
            <strong className="font-medium text-foreground">{t("policyS1UsageLabel")}</strong>{" "}
            {t("policyS1UsageBody")}
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("policyS2Title")}</h2>
        <p>{t("policyS2Intro")}</p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>{t("policyS2Item1", brandVars)}</li>
          <li>{t("policyS2Item2")}</li>
          <li>{t("policyS2Item3")}</li>
          <li>{t("policyS2Item4")}</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("policyS3Title")}</h2>
        <p>{t("policyS3Body")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("policyS4Title")}</h2>
        <p>{t("policyS4Body")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("policyS5Title")}</h2>
        <p>{t("policyS5Body")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("policyS6Title")}</h2>
        <p>
          {t("policyS6Prefix")}{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>
            {CONTACT_EMAIL}
          </a>
          {t("policyS6Suffix")}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("policyS7Title")}</h2>
        <p>{t("policyS7Body", brandVars)}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("policyS8Title")}</h2>
        <p>{t("policyS8Body")}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("policyS9Title")}</h2>
        <p>
          {t("policyS9Prefix")}{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>
            {CONTACT_EMAIL}
          </a>
          {t("policyS9Suffix")}
        </p>
      </section>
    </LegalPageShell>
  );
}
