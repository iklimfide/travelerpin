"use client";

import { BRAND } from "@/lib/constants";
import { useAppMessages } from "@/lib/i18n/client-messages";

type MapLegendProps = {
  showWishlist?: boolean;
};

export function MapLegend({ showWishlist = false }: MapLegendProps) {
  const { wishlist: wishlistMessages } = useAppMessages();
  return (
    <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 sm:mt-2 sm:gap-4">
      <span className="inline-flex items-center gap-2">
        <span
          className="h-3 w-5 rounded-sm border border-slate-700"
          style={{ backgroundColor: BRAND.colors.visited }}
        />
        {wishlistMessages.legendVisited}
      </span>
      {showWishlist && (
        <span className="inline-flex items-center gap-2">
          <span
            className="h-3 w-5 rounded-sm border"
            style={{
              backgroundColor: BRAND.colors.wishlistFill,
              borderColor: BRAND.colors.wishlist,
            }}
          />
          {wishlistMessages.legendWishlist}
        </span>
      )}
    </div>
  );
}
