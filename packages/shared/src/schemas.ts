import { z } from "zod";

export const NotificationSchema = z.object({
  type: z.enum(["email"]),
  targets: z.array(z.string()).nonempty(),
});

export const LambdaInputSchema = z.object({
  searchQuery: z.string().nonempty(),
  notifications: z.array(NotificationSchema),
  rateInMinutes: z.string().nonempty(),
  storeForAnalytics: z.boolean(),
  analyticsS3Prefix: z.string().nullable().optional(),
});

export enum OfferSource {
  KLEINANZEIGEN = "kleinanzeigen",
}

// TODO: extend this type to be useful for other platforms other than Kleinanzeigen as well
export const OfferSchema = z.object({
  id: z.string().nonempty(),
  srcUrl: z.string().nonempty(),
  thumbnailUrl: z.string().nonempty().optional(),
  location: z.string().nonempty(),
  productName: z.string().nonempty(),
  description: z.string().nonempty(),
  price: z.string().nonempty(),
  raw: z.object({
    priceRaw: z.string().nonempty(),
    innerHtml: z.string().nonempty(),
  }),
  timestamp: z.string().nonempty(),
  // Metadata
  createdAt: z.date(),
  source: z.nativeEnum(OfferSource),
});

export const HashedOfferSchema = OfferSchema.extend({
  hash: z.string().nonempty(),
});

export const OfferStoreSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("dynamodb"),
    tableName: z.string().nonempty(),
    tablePartitionKey: z.string().nonempty(),
  }),
]);

export const LambdaResultSchema = z.object({
  parsedOffers: z.array(HashedOfferSchema),
  offerStore: OfferStoreSchema,
});
