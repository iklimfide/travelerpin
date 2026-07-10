import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { BRAND } from "@/lib/constants";
import { CONTACT_EMAIL } from "@/lib/legal/contact";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("imprintTitle"),
    alternates: { canonical: "/imprint" },
  };
}

export default async function ImprintPage() {
  const t = await getTranslations("legal");

  return (
    <LegalPageShell title={t("imprintTitle")}>
      <p>
        Information about the operator of {BRAND.name}, in accordance with applicable legal
        disclosure requirements.
      </p>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Service</h2>
        <p>{BRAND.name}</p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Website</h2>
        <p>
          <a
            href={`https://${BRAND.domain}`}
            className="font-medium text-[#2563eb] hover:text-[#1d4ed8]"
          >
            {BRAND.domain}
          </a>
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Contact</h2>
        <p>
          Email:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-[#2563eb] hover:text-[#1d4ed8]"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Responsible for content</h2>
        <p>
          The person or entity operating {BRAND.name} is responsible for editorial content on this
          website, unless otherwise stated for individual user profiles and user-generated travel
          pins.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Liability for links</h2>
        <p>
          This site may contain links to external websites. We have no control over their content
          and assume no liability for third-party material. Linked pages were checked for possible
          legal violations at the time the link was set; unlawful content was not apparent.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">Copyright</h2>
        <p>
          Content and design on {BRAND.domain} are protected by copyright unless otherwise noted.
          User-submitted photos and text remain the property of their respective owners.
        </p>
      </section>
    </LegalPageShell>
  );
}
