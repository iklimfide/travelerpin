import { z } from "zod";
import { formatCityDisplayName } from "@/lib/utils/city-name";

export const cityBatchSchema = z.object({
  country_code: z.string().length(2),
  country_name: z.string().min(1),
  cities: z
    .array(
      z.object({
        city_name: z.string().min(1).max(100).transform(formatCityDisplayName),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
      })
    )
    .min(1, "Select at least one city")
    .max(50, "You can add up to 50 cities at a time"),
});

export type CityBatchInput = z.infer<typeof cityBatchSchema>;
