import { z } from "zod";
import { LIMITS } from "@/lib/constants";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { isValidVisitYearMonth, normalizeVisitDates } from "@/lib/utils/visit-date";
import { PARK_TYPES } from "@/types/database";
import { pinMediaFields, pinMediaRefineMessage, refinePinMediaInput } from "@/lib/validations/pin-media";

const parkTypeSchema = z.enum(PARK_TYPES);

const visitDatesField = z
  .array(z.string())
  .max(LIMITS.maxCityVisitDates)
  .optional()
  .nullable()
  .transform((value) => normalizeVisitDates(value ?? []));

const parkFields = {
  park_name: z
    .string()
    .min(1, "Park name is required")
    .max(100)
    .transform(formatCityDisplayName),
  park_type: parkTypeSchema,
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

export const parkInputSchema = z
  .object(parkFields)
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

export type ParkInput = z.infer<typeof parkInputSchema>;

export const parkBatchSchema = z.object({
  country_code: z.string().length(2),
  country_name: z.string().min(1),
  parks: z
    .array(
      z.object({
        park_name: z.string().min(1).max(100).transform(formatCityDisplayName),
        park_type: parkTypeSchema,
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
      })
    )
    .min(1)
    .max(50),
});

export type ParkBatchInput = z.infer<typeof parkBatchSchema>;

export const parkBatchDeleteSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, "Select at least one park")
    .max(50, "You can delete up to 50 parks at a time"),
});

export type ParkBatchDeleteInput = z.infer<typeof parkBatchDeleteSchema>;

export const quickParkSchema = z.object({
  park_name: z.string().min(1).max(100).transform(formatCityDisplayName),
  park_type: parkTypeSchema,
  country_code: z.string().length(2),
  country_name: z.string().min(1),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type QuickParkInput = z.infer<typeof quickParkSchema>;
