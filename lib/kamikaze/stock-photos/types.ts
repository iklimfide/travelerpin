export type StockPhotoProvider = "pixabay" | "unsplash" | "pexels";

export type StockPhotoHit = {
  id: string;
  provider: StockPhotoProvider;
  previewUrl: string;
  imageUrl: string;
  photographer: string | null;
  pageUrl: string | null;
};

export type StockPhotoSearchResponse = {
  results: StockPhotoHit[];
  providers: StockPhotoProvider[];
  providerErrors: Partial<Record<StockPhotoProvider, string>>;
};
