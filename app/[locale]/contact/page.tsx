import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { BRAND } from "@/lib/constants";
import { CONTACT_EMAIL } from "@/lib/legal/contact";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("contactTitle"),
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const t = await getTranslations("legal");

  return (
    <LegalPageShell title={t("contactTitle")}>
      <p>{t("contactIntro")}</p>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">{t("contactEmailLabel")}</h2>
        <p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-lg font-medium text-[#2563eb] hover:text-[#1d4ed8]"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">What to include</h2>
        <p>
          For account or privacy requests, please use the email address linked to your {BRAND.name}{" "}
          account if possible. For bug reports, a short description and the page URL help us respond
          faster.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Response time</h2>
        <p>
          We read every message and aim to reply within a few business days. Support is currently
          offered in English.
        </p>
      </section>
    </LegalPageShell>
  );
}
