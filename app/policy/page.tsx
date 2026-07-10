import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { BRAND } from "@/lib/constants";
import { CONTACT_EMAIL } from "@/lib/legal/contact";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return {
    title: t("policyTitle"),
    alternates: { canonical: "/policy" },
  };
}

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("legal");

  return (
    <LegalPageShell title={t("policyTitle")}>
      <p>
        This Privacy Policy describes how {BRAND.name} (&quot;we&quot;, &quot;us&quot;) collects,
        uses, and protects information when you use {BRAND.domain}.
      </p>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">1. Information we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="font-medium text-foreground">Account data:</strong> email address,
            username, display name, profile details you choose to add, and authentication
            credentials handled by our auth provider.
          </li>
          <li>
            <strong className="font-medium text-foreground">Travel content:</strong> pinned
            destinations, visit dates, notes, photos, and links you add to your map.
          </li>
          <li>
            <strong className="font-medium text-foreground">Usage data:</strong> basic logs such as
            IP address, browser type, pages visited, and actions needed to operate and secure the
            service.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">2. How we use information</h2>
        <p>We use your information to:</p>
        <ul className="mt-2 list-disc space-y-2 pl-5">
          <li>Provide, maintain, and improve {BRAND.name}</li>
          <li>Display your public profile and travel map to visitors you choose to share with</li>
          <li>Send service-related messages such as account or security notices</li>
          <li>Prevent abuse, fraud, and security incidents</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">3. Sharing</h2>
        <p>
          Your public profile and pinned destinations are visible to anyone with your profile link,
          according to your privacy settings. We do not sell your personal information. We may share
          data with infrastructure providers (hosting, storage, analytics) who process it on our
          behalf under contractual safeguards, or when required by law.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">4. Cookies and storage</h2>
        <p>
          We use cookies and similar technologies to keep you signed in, remember preferences, and
          understand how the product is used. You can control cookies through your browser settings,
          though some features may not work without them.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">5. Retention</h2>
        <p>
          We keep your information while your account is active and for a reasonable period
          afterward to comply with legal obligations, resolve disputes, and enforce our agreements.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">6. Your choices</h2>
        <p>
          You can update profile information in settings, control wishlist visibility, and delete
          content you have added. To request account deletion or a copy of your data, contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-[#2563eb] hover:text-[#1d4ed8]"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">7. Children</h2>
        <p>
          {BRAND.name} is not directed at children under 13. We do not knowingly collect personal
          information from children under 13.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">8. Changes</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the revised version on
          this page with an updated effective date.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-foreground">9. Contact</h2>
        <p>
          Privacy questions? Email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-[#2563eb] hover:text-[#1d4ed8]"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
