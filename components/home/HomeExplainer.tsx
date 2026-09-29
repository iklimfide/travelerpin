"use client";

import { AddDestinationModal } from "@/components/add/AddDestinationModal";

type HomeExplainerProps = {
  name: string;
  countries: number;
  cities: number;
  compact?: boolean;
  profileHref?: string;
};

export function HomeExplainer(_props: HomeExplainerProps) {
  return (
    <div className="home-add-destination w-full min-w-0">
      <AddDestinationModal embedded onClose={() => {}} />
    </div>
  );
}
