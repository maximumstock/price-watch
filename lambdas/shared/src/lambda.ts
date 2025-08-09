import { Context } from "aws-lambda";
import { z } from "zod";

export const NotificationSchema = z.object({
  type: z.enum(["email"]),
  targets: z.array(z.string()).nonempty(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const LambdaInputSchema = z.object({
  searchQuery: z.string().nonempty(),
  notifications: z.array(NotificationSchema),
  rateInMinutes: z.string().nonempty(),
  storeForAnalytics: z.boolean(),
  analyticsS3Prefix: z.string().nullable().optional(),
});

export type LambdaInput = z.infer<typeof LambdaInputSchema>;

export function validateInputEvent(input: any): LambdaInput {
  const result = LambdaInputSchema.safeParse(input);
  if (!result.success) {
    const error = new Error("Invalid LambdaInput");

    error.cause = result.error.cause;
    error.stack = result.error.stack;
    error.name = result.error.name;

    throw error;
  } else {
    return result.data;
  }
}

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

export type Offer = z.infer<typeof OfferSchema>;

export const HashedOfferSchema = OfferSchema.extend({
  hash: z.string().nonempty(),
});

export type HashedOffer = z.infer<typeof HashedOfferSchema>;

const OfferStoreSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("dynamodb"),
    tableName: z.string().nonempty(),
    tablePartitionKey: z.string().nonempty(),
  }),
]);

export type OfferStore = z.infer<typeof OfferStoreSchema>;

export type LambdaHandler = (
  inputEvent: LambdaInput,
  context?: Context
) => Promise<LambdaResult>;

export const LambdaResultSchema = z.object({
  parsedOffers: z.array(HashedOfferSchema),
  offerStore: OfferStoreSchema,
});

export type LambdaResult = z.infer<typeof LambdaResultSchema>;

/**
 * Returns a closure that we can pass to AWS Lambda to run.
 * This closure does everything from fetching, parsing and post-processing
 */
export type LambdaBuilder = (
  handler: LambdaHandler
) => (input: any, context?: Context) => void;
