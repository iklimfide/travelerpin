import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${BRAND.name} — the rules for using ${BRAND.domain}.`,
  alternates: { canonical: "/terms" },
  openGraph: {
    title: `Terms of Service | ${BRAND.name}`,
    description: `Terms of Service for ${BRAND.name}.`,
    url: `${getSiteUrl()}/terms`,
  },
};

const LAST_UPDATED = "July 9, 2026";
const CONTACT_EMAIL = `hello@${BRAND.domain}`;

type Section = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const SECTIONS: Section[] = [
  {
    title: "1. Acceptance of these terms",
    paragraphs: [
      `By creating an account, accessing, or using ${BRAND.name} (${BRAND.domain}), you agree to these Terms of Service. If you do not agree, do not use the service.`,
    ],
  },
  {
    title: "2. What TravelerPin is",
    paragraphs: [
      `${BRAND.name} is a travel map product that lets you pin countries, cities, and parks you have visited, share a public profile link, and optionally follow other travelers.`,
      "We may improve, change, or discontinue features over time.",
    ],
  },
  {
    title: "3. Accounts",
    paragraphs: [
      "You must provide accurate information when you register and keep your login details secure. You are responsible for activity under your account.",
      "Usernames must follow our rules and may not impersonate others or use reserved words. We may reclaim or disable usernames that violate these terms.",
      "You must be old enough to form a binding contract in your country (and at least 13 years old) to use the service.",
    ],
  },
  {
    title: "4. Your content",
    paragraphs: [
      "You keep ownership of the content you add (for example profile details, pins, photos, and notes).",
      `By posting content on ${BRAND.name}, you grant us a worldwide, non-exclusive license to host, display, and distribute that content as needed to operate and promote the service (including public profile pages and share cards).`,
      "You confirm that you have the rights to the content you upload and that it does not infringe others’ rights.",
    ],
  },
  {
    title: "5. Acceptable use",
    paragraphs: ["You agree not to:"],
    bullets: [
      "Use the service for illegal, harmful, or abusive purposes",
      "Harass, threaten, or impersonate other people",
      "Upload malware, scrape the service in an abusive way, or attempt to break security",
      "Post spam, misleading claims, or content that violates others’ privacy or intellectual property",
      "Interfere with the normal operation of the site or other users’ accounts",
    ],
  },
  {
    title: "6. Public profiles and sharing",
    paragraphs: [
      "Public profile pages and destination hubs may be visible to anyone with the link or through search. Choose carefully what you share.",
      "Wishlist visibility and similar privacy controls are available in settings where offered. Default visibility may still make some travel data public.",
    ],
  },
  {
    title: "7. Third-party services",
    paragraphs: [
      `${BRAND.name} may rely on third parties (for example authentication, hosting, storage, or maps). Their terms and privacy practices also apply when you use those services through us.`,
      "Links to Instagram or other external sites are provided for convenience. We are not responsible for third-party sites or content.",
    ],
  },
  {
    title: "8. Intellectual property",
    paragraphs: [
      `The ${BRAND.name} name, logo, design, and software are owned by us or our licensors. You may not copy or reuse them except as allowed by these terms or with our written permission.`,
    ],
  },
  {
    title: "9. Suspension and termination",
    paragraphs: [
      "You may stop using the service at any time. We may suspend or terminate accounts that violate these terms or that create risk for the service or other users.",
      "After termination, we may delete or retain data as needed for legal, security, or operational reasons.",
    ],
  },
  {
    title: "10. Disclaimers",
    paragraphs: [
      `The service is provided “as is” and “as available.” Travel information, maps, and counts may contain errors or delays. We do not guarantee uninterrupted or error-free operation.`,
      `${BRAND.name} is not a substitute for official travel advice, visas, or safety guidance.`,
    ],
  },
  {
    title: "11. Limitation of liability",
    paragraphs: [
      "To the fullest extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of data, profits, or goodwill arising from your use of the service.",
      "Our total liability for any claim related to the service is limited to the greater of (a) the amount you paid us in the 12 months before the claim, or (b) USD 50.",
    ],
  },
  {
    title: "12. Changes to these terms",
    paragraphs: [
      "We may update these terms from time to time. The “Last updated” date at the top will change when we do. Continued use after changes means you accept the updated terms.",
    ],
  },
  {
    title: "13. Contact",
    paragraphs: [
      `Questions about these terms: ${CONTACT_EMAIL}`,
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 text-slate-200">
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-400">
          <Link href="/" className="hover:text-blue-300">
            {BRAND.name}
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="space-y-8 text-[15px] leading-relaxed">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-white">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="mt-3 text-slate-300">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <p className="mt-12 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-800 pt-6 text-sm text-slate-500">
        <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
          Privacy Policy
        </Link>
        <Link href="/imprint" className="text-blue-400 hover:text-blue-300">
          Imprint
        </Link>
        <Link href="/contact" className="text-blue-400 hover:text-blue-300">
          Contact
        </Link>
        <Link href="/" className="text-blue-400 hover:text-blue-300">
          Back to {BRAND.name}
        </Link>
      </p>
    </main>
  );
}
