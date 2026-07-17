import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { BRAND } from "@/lib/constants";
import { DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS, getSiteUrl } from "@/lib/seo/site";
import {
  PIN_MAP_OG_DESCRIPTION,
  PIN_MAP_OG_TITLE,
  staticOpenGraphImages,
  staticTwitterImages,
} from "@/lib/seo/og";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import { ClientMessagesProvider } from "@/lib/i18n/ClientMessagesProvider";
import enMessages from "@/messages/en.json";
import { ModalProvider } from "@/components/ui/ModalProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
import { SharePinPromptProvider } from "@/components/share/SharePinPromptProvider";
import { DashboardAddProvider } from "@/components/dashboard/DashboardAddProvider";
import { AddDestinationProvider } from "@/components/add/AddDestinationProvider";
import { NextRouteDestinationProvider } from "@/components/add/NextRouteDestinationProvider";
import { WishlistDestinationProvider } from "@/components/add/WishlistDestinationProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ClearPwaArtifacts } from "@/components/dev/ClearPwaArtifacts";
import { DevMobilePreview } from "@/components/dev/DevMobilePreview";
import { MobilePreviewEmbedRoot } from "@/components/dev/MobilePreviewEmbedRoot";
import { OwnProfileShellGate } from "@/components/dashboard/OwnProfileShellGate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();
const GA_MEASUREMENT_ID = "G-5GZPZZ0GB0";

export const metadata: Metadata = {
  title: {
    default: BRAND.name,
    template: `%s | ${BRAND.name}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: BRAND.name,
    title: PIN_MAP_OG_TITLE,
    description: PIN_MAP_OG_DESCRIPTION,
    images: staticOpenGraphImages(),
  },
  twitter: {
    card: "summary_large_image",
    title: PIN_MAP_OG_TITLE,
    description: PIN_MAP_OG_DESCRIPTION,
    images: staticTwitterImages(),
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let locale: Locale = defaultLocale;
  let messages: Record<string, unknown> = enMessages;

  try {
    locale = (await getLocale()) as Locale;
    messages = await getMessages();
  } catch {
    // Fallback when request config is unavailable (e.g. during error recovery)
  }

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} light h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full min-w-0 flex-col overflow-x-hidden bg-background text-foreground">
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ClientMessagesProvider>
          <ThemeProvider>
            <ClearPwaArtifacts />
            <ModalProvider>
              <ToastProvider>
                <DashboardAddProvider>
                  <AddDestinationProvider>
                    <NextRouteDestinationProvider>
                      <WishlistDestinationProvider>
                        <OwnProfileShellGate>
                          <SharePinPromptProvider>
                            <AuthModalProvider>{children}</AuthModalProvider>
                          </SharePinPromptProvider>
                        </OwnProfileShellGate>
                      </WishlistDestinationProvider>
                    </NextRouteDestinationProvider>
                  </AddDestinationProvider>
                </DashboardAddProvider>
              </ToastProvider>
            </ModalProvider>
          </ThemeProvider>
          </ClientMessagesProvider>
        </NextIntlClientProvider>
        {process.env.NODE_ENV === "development" ? (
          <Suspense fallback={null}>
            <MobilePreviewEmbedRoot />
            <DevMobilePreview />
          </Suspense>
        ) : null}
      </body>
    </html>
  );
}
