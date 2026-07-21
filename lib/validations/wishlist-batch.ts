import { z } from "zod";
import { countrySchema } from "@/lib/validations/country";

export const wishlistBatchSchema = z.object({
  add: z.array(countrySchema).max(50).default([]),
  remove_ids: z.array(z.string().min(1)).max(50).default([]),
});

export type WishlistBatchInput = z.infer<typeof wishlistBatchSchema>;
