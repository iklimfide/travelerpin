import { z } from "zod";
import { LIMITS } from "@/lib/constants";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { isValidVisitYearMonth, normalizeVisitDates } from "@/lib/utils/visit-date";
import { pinMediaFields, pinMediaRefineMessage, refinePinMediaInput } from "@/lib/validations/pin-media";

const visitDatesField = z
  .array(z.string())
  .max(LIMITS.maxCityVisitDates)
  .optional()
  .nullable()
  .transform((value) => normalizeVisitDates(value ?? []));

const cityFields = {
  city_name: z
    .string()
    .min(1, "City name is required")
    .max(100)
    .transform(formatCityDisplayName),
  country_code: z.string().length(2, "Invalid country code"),
  country_name: z.string().min(1, "Country name is required"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  note: z
    .string()
    .max(LIMITS.noteMaxLength, `Note must be at most ${LIMITS.noteMaxLength} characters`)
    .optional()
    .nullable(),
  ...pinMediaFields,
  visit_dates: visitDatesField,
};

/** Client payload — coordinates optional when picked from search. */
export const cityInputSchema = z
  .object(cityFields)
  .refine(
    (data) => (data.visit_dates ?? []).every(isValidVisitYearMonth),
    { message: "Invalid visit date format" }
  )
  .refine(refinePinMediaInput, { message: pinMediaRefineMessage })
  .refine(
    (data) => {
      const hasLat = data.latitude !== undefined;
      const hasLng = data.longitude !== undefined;
      return hasLat === hasLng;
    },
    { message: "Both latitude and longitude are required when providing coordinates" }
  );

export type CityInput = z.infer<typeof cityInputSchema>;
