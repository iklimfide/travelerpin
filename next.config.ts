import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { getR2PublicHostname } from "./lib/storage/r2";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const r2Hostname = getR2PublicHostname();

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp"],
  images: {
    localPatterns: [
      {
        pathname: "/api/hub-photo",
      },
      {
        pathname: "/api/**",
      },
      {
        pathname: "/images/**",
      },
      {
        pathname: "/demo/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
        pathname: "/**",
      },
      ...(r2Hostname
        ? [
            {
              protocol: "https" as const,
              hostname: r2Hostname,
              pathname: "/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "**.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
