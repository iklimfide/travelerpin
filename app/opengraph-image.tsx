import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/constants";
import { DEMO_CITIES } from "@/lib/data/demo-cities";
import { DEMO_VISITED_COUNTRY_CODES } from "@/lib/data/demo-countries";
import { DEMO_WISHLIST_COUNTRY_CODES } from "@/lib/data/demo-wishlist";
import { OG_IMAGE_SIZE } from "@/lib/seo/og";
import { ogMapDataUrl } from "@/lib/seo/og-map-svg";
import { DEFAULT_DESCRIPTION } from "@/lib/seo/site";

export const runtime = "edge";
export const revalidate = 86400;
export const alt = `${BRAND.name} travel map`;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default function OgImage() {
  const mapSrc = ogMapDataUrl(
    DEMO_VISITED_COUNTRY_CODES,
    DEMO_CITIES,
    DEMO_WISHLIST_COUNTRY_CODES
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BRAND.colors.background,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            height: "360px",
            width: "100%",
            overflow: "hidden",
            borderBottom: `2px solid ${BRAND.colors.unvisited}`,
          }}
        >
          <img
            src={mapSrc}
            alt=""
            width={1200}
            height={360}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 48px",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: BRAND.colors.pin,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "50%",
                  background: BRAND.colors.background,
                }}
              />
            </div>
            <span style={{ fontSize: "44px", fontWeight: 700, color: "#f8fafc" }}>
              {BRAND.name}
            </span>
          </div>
          <p
            style={{
              fontSize: "24px",
              color: "#94a3b8",
              textAlign: "center",
              maxWidth: "900px",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {DEFAULT_DESCRIPTION}
          </p>
        </div>
      </div>
    ),
    { ...size }
  );
}
