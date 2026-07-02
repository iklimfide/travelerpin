"use client";

import { HubPagePinCount, type HubPinStatItem } from "@/components/hub/HubPagePinCount";

type CityPagePinStatsBlockProps = {
  pinCountItems: HubPinStatItem[];
};

export function CityPagePinStatsBlock({ pinCountItems }: CityPagePinStatsBlockProps) {
  return <HubPagePinCount items={pinCountItems} />;
}
