import { z } from "zod";
import { LIMITS } from "@/lib/constants";
import { MARITAL_STATUS_OPTIONS, PROFESSION_OPTIONS } from "@/lib/data/profile-options";
import { formatDisplayName } from "@/lib/utils/display-name";
import { formatCityDisplayName } from "@/lib/utils/city-name";
import { normalizeInstagramProfileUrl } from "@/lib/utils/instagram";

const professionValues = PROFESSION_OPTIONS.map((o) => o.value);
const maritalValues = MARITAL_STATUS_OPTIONS.map((o) => o.value);

export const profileSettingsSchema = z
  .object({
    wishlist_public: z.boolean().optional(),
    share_prompt_mode: z.enum(["every_pin", "after_30m", "never"]).optional(),
    display_name: z
      .string()
      .max(LIMITS.displayNameMaxLength)
      .transform((value) => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        return formatDisplayName(trimmed);
      })
      .nullable()
      .optional(),
    bio: z
      .string()
      .max(LIMITS.bioMaxLength)
      .transform((value) => value.trim())
      .nullable()
      .optional(),
    residence: z
      .string()
      .max(LIMITS.residenceMaxLength)
      .transform((value) => value.trim())
      .nullable()
      .optional(),
    instagram_url: z
      .string()
      .max(120)
      .transform((value, ctx) => {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const normalized = normalizeInstagramProfileUrl(trimmed);
        if (!normalized) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter a valid Instagram profile URL",
          });
          return z.NEVER;
        }
        return normalized;
      })
      .nullable()
      .optional(),
    profession: z.enum(professionValues as [string, ...string[]]).nullable().optional(),
    marital_status: z.enum(maritalValues as [string, ...string[]]).nullable().optional(),
    avatar_url: z.string().url().nullable().optional(),
    cover_url: z.string().url().nullable().optional(),
    residence_city: z
      .object({
        city_name: z.string().min(1).max(100).transform(formatCityDisplayName),
        country_code: z.string().length(2).transform((value) => value.toUpperCase()),
        country_name: z.string().min(1),
        latitude: z.number().min(-90).max(90).nullable().optional(),
        longitude: z.number().min(-180).max(180).nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No fields to update",
  });

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;

export const PROFILE_SELECT =
  "username, display_name, avatar_url, cover_url, bio, residence, instagram_url, profession, marital_status, wishlist_public, share_prompt_mode";
