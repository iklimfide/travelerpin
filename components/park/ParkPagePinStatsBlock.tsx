"use client";

import { HubPagePinCount, type HubPinStatItem } from "@/components/hub/HubPagePinCount";

type ParkPagePinStatsBlockProps = {
  pinCountItems: HubPinStatItem[];
};

export function ParkPagePinStatsBlock({ pinCountItems }: ParkPagePinStatsBlockProps) {
  return <HubPagePinCount items={pinCountItems} />;
}
