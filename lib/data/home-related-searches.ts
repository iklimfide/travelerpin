import { profilePath } from "@/lib/seo/site";

export type RelatedSearchSegment = {
  text: string;
  bold?: boolean;
};

export type RelatedSearchItem = {
  href: string;
  segments: RelatedSearchSegment[];
};

/** Curated query-style internal links for homepage SEO (Google “People also search for”). */
export function getHomeRelatedSearches(demoUsername: string): RelatedSearchItem[] {
  const demoProfile = profilePath(demoUsername);

  return [
    {
      href: "/register",
      segments: [
        { text: "Visited countries " },
        { text: "checklist", bold: true },
      ],
    },
    {
      href: demoProfile,
      segments: [
        { text: "Countries visited " },
        { text: "counter", bold: true },
      ],
    },
    {
      href: "/register",
      segments: [
        { text: "Countries visited " },
        { text: "counter app", bold: true },
      ],
    },
    {
      href: demoProfile,
      segments: [
        { text: "Visited countries " },
        { text: "map percentage", bold: true },
      ],
    },
    {
      href: "/register",
      segments: [
        { text: "Countries visited " },
        { text: "counter app free", bold: true },
      ],
    },
    {
      href: "/register",
      segments: [
        { text: "Count", bold: true },
        { text: " how many countries " },
        { text: "I've", bold: true },
        { text: " visited " },
        { text: "free", bold: true },
      ],
    },
    {
      href: "/register",
      segments: [
        { text: "Visited countries " },
        { text: "map free", bold: true },
      ],
    },
    {
      href: demoProfile,
      segments: [
        { text: "Countries visited " },
        { text: "map", bold: true },
      ],
    },
  ];
}
