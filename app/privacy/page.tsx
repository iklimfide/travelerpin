import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/lib/constants";
import { getSiteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${BRAND.name} — how we collect, use, and share your information.`,
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: `Privacy Policy | ${BRAND.name}`,
    description: `Privacy Policy for ${BRAND.name}.`,
    url: `${getSiteUrl()}/privacy`,
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
    title: "1. Introduction",
    paragraphs: [
      `This Privacy Policy explains how ${BRAND.name} (${BRAND.domain}) collects, uses, and shares information when you use our travel map service.`,
      "By using the service, you acknowledge this policy. If you do not agree, please do not use TravelerPin.",
    ],
  },
  {
    title: "2. Information we collect",
    paragraphs: ["We may collect:"],
    bullets: [
      "Account details such as email, username, display name, password (stored securely by our auth provider), and optional profile fields (bio, residence, Instagram link, photo)",
      "Travel data you add: visited countries, cities, parks, wishlist items, visit dates, notes, and media you upload",
      "Social activity such as follows and notifications related to your account",
      "Technical data such as IP address, device/browser type, approximate location derived from IP, cookies or similar storage, and basic usage logs needed to run and secure the site",
    ],
  },
  {
    title: "3. How we use information",
    paragraphs: ["We use information to:"],
    bullets: [
      "Provide and improve your travel map, profile, and sharing features",
      "Authenticate you, keep the service secure, and prevent abuse",
      "Show public profile pages and destination hubs when content is public",
      "Send transactional messages (for example email confirmation) and, where enabled, in-app notifications",
      "Understand aggregate usage so we can fix bugs and improve performance",
    ],
  },
  {
    title: "4. What is public",
    paragraphs: [
      "Your public profile link may show your display name, photo, travel pins, stats, and other content you choose to share. Anyone with the link (and search engines, depending on settings) may see that information.",
      "Wishlist visibility and similar controls are available in settings where offered. Content you mark private is not intended for public profile display, but no online system is perfectly secure.",
      "Share cards and screenshots you download may include profile and map information you choose to share on other platforms.",
    ],
  },
  {
    title: "5. Sharing with others",
    paragraphs: [
      "We do not sell your personal information.",
      "We share data with service providers that help us operate TravelerPin (for example hosting, authentication, databases, file storage, and analytics). They may process data only as needed to provide those services.",
      "We may disclose information if required by law, to protect rights and safety, or in connection with a merger, acquisition, or asset transfer.",
    ],
  },
  {
    title: "6. Cookies and similar technologies",
    paragraphs: [
      "We use cookies and similar storage for sign-in sessions, preferences, and basic site operation. You can control cookies through your browser settings; disabling them may break login or other features.",
    ],
  },
  {
    title: "7. Data retention",
    paragraphs: [
      "We keep account and travel data while your account is active. If you delete content or close your account, we remove or anonymize data when reasonably possible, except where we must retain it for legal, security, or operational reasons (for example backups for a limited period).",
    ],
  },
  {
    title: "8. Your choices",
    paragraphs: ["You can:"],
    bullets: [
      "Update profile and privacy-related settings in your account",
      "Edit or remove pins and media you added",
      "Request account deletion or a copy of your data by contacting us",
      "Opt out of optional share prompts where that setting is available",
    ],
  },
  {
    title: "9. Children",
    paragraphs: [
      "TravelerPin is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided information, contact us and we will take appropriate steps.",
    ],
  },
  {
    title: "10. International users",
    paragraphs: [
      "We may process and store information in countries other than where you live. Those countries may have different data-protection laws. By using the service, you understand that your information may be transferred as needed to operate TravelerPin.",
    ],
  },
  {
    title: "11. Changes to this policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. The “Last updated” date at the top will change when we do. Continued use after changes means you accept the updated policy.",
    ],
  },
  {
    title: "12. Contact",
    paragraphs: [
      `Privacy questions or requests: ${CONTACT_EMAIL}`,
      `See also our Terms of Service at ${BRAND.domain}/terms.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 text-slate-200">
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-400">
          <Link href="/" className="hover:text-blue-300">
            {BRAND.name}
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Privacy Policy</h1>
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
        <Link href="/terms" className="text-blue-400 hover:text-blue-300">
          Terms of Service
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
