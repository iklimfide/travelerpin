"use client";

import { HubPagePinCount, type HubPinStatItem } from "@/components/hub/HubPagePinCount";

type CountryPagePinStatsBlockProps = {
  pinCountItems: HubPinStatItem[];
};

export function CountryPagePinStatsBlock({ pinCountItems }: CountryPagePinStatsBlockProps) {
  return <HubPagePinCount items={pinCountItems} />;
}
