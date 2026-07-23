import { z } from "zod";
import {
  NEXT_ROUTE_MAX_STOPS,
  NEXT_ROUTE_MAX_TOTAL_DAYS,
  parseNextRoutePayload,
} from "@/lib/utils/next-route";

const nextRouteStopSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(["country", "city"]),
  name: z.string().min(1).max(120),
  countryCode: z.string().length(2).optional(),
  countryName: z.string().min(1).max(120).optional(),
  slug: z.string().max(120).nullable().optional(),
  href: z.string().max(200).nullable().optional(),
});

export const nextRouteUpdateSchema = z.object({
  stops: z.array(nextRouteStopSchema).max(NEXT_ROUTE_MAX_STOPS),
  totalDays: z.number().int().min(0).max(NEXT_ROUTE_MAX_TOTAL_DAYS).optional(),
  transport: z.enum(["car", "train", "bus", "bicycle", "walking"]).optional(),
});

export type NextRouteUpdateInput = z.infer<typeof nextRouteUpdateSchema>;

export function parseNextRouteUpdate(body: unknown) {
  const parsed = nextRouteUpdateSchema.safeParse(body);
  if (!parsed.success) return parsed;

  return {
    success: true as const,
    data: parseNextRoutePayload(parsed.data),
  };
}
