import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { BRAND } from "@/lib/constants";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("termsTitle"),
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const t = await getTranslations("legal");

  return (
    <LegalPageShell title={t("termsTitle")}>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of {BRAND.name} at{" "}
        {BRAND.domain}. By creating an account or using the service, you agree to these Terms.
      </p>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">1. The service</h2>
        <p>
          {BRAND.name} lets you pin countries, cities, and parks you have visited, build a public
          travel map, and share it with others. Features may change over time as we improve the
          product.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">2. Your account</h2>
        <p>
          You are responsible for your account credentials and for activity under your account. Keep
          your password secure and notify us if you suspect unauthorized access.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">3. Your content</h2>
        <p>
          You retain ownership of photos, notes, and other content you upload. You grant us a
          limited license to host, display, and distribute that content solely to operate and
          promote the service. You must have the rights to anything you upload and must not post
          unlawful, infringing, or harmful material.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">4. Acceptable use</h2>
        <p>
          Do not misuse the platform: no harassment, spam, scraping at scale, attempts to break
          security, or interference with other users. We may remove content or suspend accounts
          that violate these rules.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">5. Privacy</h2>
        <p>
          Our{" "}
          <a href="/policy" className="font-medium text-[#2563eb] hover:text-[#1d4ed8]">
            Privacy Policy
          </a>{" "}
          explains how we collect and use personal data.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">6. Disclaimers</h2>
        <p>
          The service is provided &quot;as is&quot; without warranties of any kind. We do not
          guarantee uninterrupted or error-free operation. Travel information on the site is for
          personal sharing only and is not professional travel advice.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">7. Changes</h2>
        <p>
          We may update these Terms from time to time. Continued use after changes take effect
          means you accept the updated Terms.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">8. Contact</h2>
        <p>
          Questions about these Terms? Reach us at{" "}
          <a
            href="mailto:hello@travelerpin.com"
            className="font-medium text-[#2563eb] hover:text-[#1d4ed8]"
          >
            hello@travelerpin.com
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
