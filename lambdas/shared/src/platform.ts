import { Readable, Stream } from "stream";
import { Configuration, readConfigFromEnv } from "./config";
import {
  HashedOffer,
  LambdaBuilder,
  LambdaHandler,
  LambdaInput,
  LambdaResult,
  validateInputEvent,
} from "./lambda";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ParquetFieldBuilder,
  ParquetSchema,
  ParquetTransformer,
} from "@dsnp/parquetjs";
import { Context } from "aws-lambda";

/** Generic builder that takes some providers and can construct a closure that we pass to AWS Lambda */
export const createAWSLambdaHandler: LambdaBuilder = (
  handler: LambdaHandler
) => {
  // return a Lambda handler that AWS Lambda executes
  return async (input: any, context?: Context) => {
    const configuration = readConfigFromEnv();
    console.log(
      `Read configuration from environment: ${JSON.stringify(configuration)}`
    );
    const inputEvent = validateInputEvent(input);
    console.log("New Event:", JSON.stringify(input, null, 2));

    // Process input event with site-specific logic
    const result = await handler(inputEvent, context);

    if (result.parsedOffers.length === 0) {
      return;
    }

    // Post-processing
    switch (result.offerStore.type) {
      case "dynamodb":
        await updateOfferStoreDynamoDb(
          result.parsedOffers,
          result.offerStore.tableName,
          result.offerStore.tablePartitionKey
        );
        break;
      default:
        throw new Error(
          `Encountered unknown store type ${result.offerStore.type}`
        );
    }

    if (result.parsedOffers.length === 0) {
      return;
    }

    // TODO: handle storing analytics
    if (inputEvent.storeForAnalytics) {
      const s3Client = new S3Client();
      await storeParquetOffersForAnalytics(
        configuration,
        s3Client,
        inputEvent,
        result.parsedOffers
      );
    }

    // TODO: handle sending notifications
    await handleNotifications(inputEvent, configuration, result);
  };
};

async function handleNotifications(
  inputEvent: LambdaInput,
  configuration: Configuration,
  result: LambdaResult
) {
  if (result.parsedOffers.length === 0) {
    return;
  }

  const emailTargets = inputEvent.notifications
    .filter((n) => n.type === "email")
    .map((n) => n.targets)
    .flat();

  if (emailTargets.length === 0) {
    return;
  }

  const sesClient = new SESClient({ region: configuration.awsRegion });
  await sendEmailNotifications(
    configuration,
    sesClient,
    emailTargets,
    result.parsedOffers
  );
}

/**
 * The limit on the number of items we store in a hash string in DynamoDB.
 *
 * Derives from the 400KiB DynamoDB item limit divided by 33B (32B hash + `#` separator) and some conservative rounding.
 */
const DYNAMODB_HASH_ITEM_LIMIT = 12_000;

export const DYNAMODB_TABLE_NAME = "SeenOffersV1";

/**
 * Combine existing and new hashes into a new hash string and write it to
 * DynamoDB table `SeenOffersV1` for the given partition key.
 */
async function writeSeenOffersSet(
  dynamoDb: DynamoDBDocumentClient,
  dynamoTableName: string,
  partitionKey: string,
  existingHashes: Set<string>,
  newHashes: string[]
) {
  const nFreeSlots = DYNAMODB_HASH_ITEM_LIMIT - existingHashes.size;
  const nSlotsToRemove = Math.max(0, newHashes.length - nFreeSlots);

  const combinedHashes = Array.from(existingHashes)
    .slice(nSlotsToRemove)
    .concat(newHashes);
  const hashString = combinedHashes.join("#");

  await dynamoDb.send(
    new PutCommand({
      TableName: dynamoTableName,
      Item: {
        Key: partitionKey,
        Value: hashString,
      },
    })
  );
}

/**
 * Read DynamoDB key from table `SeenOffersV1` for the given partition key.
 */
async function fetchSeenOffersSet(
  dynamoDb: DynamoDBDocumentClient,
  dynamoTableName: string,
  partitionKey: string
): Promise<Set<string>> {
  const seenOffers = await dynamoDb.send(
    new GetCommand({
      TableName: dynamoTableName,
      Key: {
        Key: partitionKey,
      },
    })
  );

  if (
    seenOffers.Item?.Value == null ||
    typeof seenOffers.Item?.Value !== "string"
  ) {
    // return an empty string if no item was found, to start building the hash string
    return new Set();
  }

  return new Set(seenOffers.Item?.Value.split("#"));
}

async function storeParquetOffersForAnalytics(
  configuration: Configuration,
  s3Client: S3Client,
  inputEvent: LambdaInput,
  newOffers: HashedOffer[]
) {
  console.log(`[Info] Beginning analytics parquet storage dump...`);
  const parquetSchema = new ParquetSchema({
    id: ParquetFieldBuilder.createStringField(false, {
      type: "UTF8",
      compression: "SNAPPY",
    }),
    srcUrl: ParquetFieldBuilder.createStringField(false, {
      type: "UTF8",
      compression: "SNAPPY",
    }),
    thumbnailUrl: ParquetFieldBuilder.createStringField(false, {
      type: "UTF8",
      compression: "SNAPPY",
    }),
    location: ParquetFieldBuilder.createStringField(false, {
      type: "UTF8",
      compression: "SNAPPY",
    }),
    productName: ParquetFieldBuilder.createStringField(false, {
      type: "UTF8",
      compression: "SNAPPY",
    }),
    description: ParquetFieldBuilder.createStringField(false, {
      type: "UTF8",
      compression: "SNAPPY",
    }),
    raw: ParquetFieldBuilder.createStructField({
      priceRaw: ParquetFieldBuilder.createStringField(false, {
        type: "UTF8",
        compression: "SNAPPY",
      }),
      innerHtml: ParquetFieldBuilder.createStringField(false, {
        type: "UTF8",
        compression: "SNAPPY",
      }),
    }),
    price: ParquetFieldBuilder.createStringField(false, {
      type: "UTF8",
      compression: "SNAPPY",
    }),
    timestamp: ParquetFieldBuilder.createStringField(false, {
      type: "UTF8",
      compression: "SNAPPY",
    }),
    createdAt: ParquetFieldBuilder.createTimestampField(false, {
      type: "TIMESTAMP_MILLIS",
      compression: "SNAPPY",
    }),
    source: ParquetFieldBuilder.createStringField(false, {
      type: "UTF8",
      compression: "SNAPPY",
    }),
  });

  try {
    const prefix =
      inputEvent.analyticsS3Prefix ??
      `kleinanzeigen/${inputEvent.analyticsS3Prefix ?? inputEvent.searchQuery}`;
    const filename = `${new Date().toISOString()}.parquet`;
    const key = `${prefix}/${filename}`;

    // todo: write a unit test that verifies this shit
    // todo: use a more up-to-date parquet implementation
    const newOfferStream = Readable.from(newOffers);
    const parquetStream = newOfferStream.pipe(
      new ParquetTransformer(parquetSchema)
    );
    const buffer = await streamToBuffer(parquetStream);

    const command = new PutObjectCommand({
      Bucket: configuration.analyticsS3Bucket,
      Key: key,
      Body: buffer,
      ContentType: "application/vnd.apache.parquet",
    });
    const response = await s3Client.send(command);

    console.log(
      `[Info] Finished analytics parquet storage dump with status code ${response.$metadata.httpStatusCode}`
    );
  } catch (e) {
    console.error(
      `[error] Encountered ${JSON.stringify(e)} during parquet analytics dump`
    );
    console.error(e);
  }
}

async function streamToBuffer(stream: Stream): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const _buf: any[] = [];

    stream.on("data", (chunk) => _buf.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(_buf)));
    stream.on("error", (err) => reject(err));
  });
}
async function sendEmailNotifications(
  configuration: Configuration,
  sesClient: SESClient,
  destinationEmails: string[],
  newOffers: HashedOffer[]
) {
  if (newOffers.length === 0) {
    console.log("[Info] No new offers to notify about");
    return;
  }

  if (destinationEmails.length === 0) {
    throw new Error(
      "Cannot send email notifications with empty destinationEmails list"
    );
  }

  await sesClient.send(
    new SendEmailCommand({
      Source: configuration.sourceEmail,
      Destination: {
        ToAddresses: destinationEmails,
      },
      Message: {
        Body: {
          Html: {
            Data: `
            <body>
            <h1>${newOffers.length} New Offers</h1>
            <ul>
            ${newOffers
              .map(
                (o) => `<li>
                  <a href="${o.srcUrl}" target="_blank">${o.productName}<a>&nbsp;${o.description} - ${o.raw.priceRaw} - ${o.location} - ${o.timestamp}
                  <img src="${o.thumbnailUrl}" />
                  </li>`
              )
              .join("\n")}
            </ul>
            </body>
            `,
          },
        },
        Subject: {
          Data: "Kleinanzeigen - New Offers",
        },
      },
    })
  );
}

async function updateOfferStoreDynamoDb(
  parsedOffers: HashedOffer[],
  tableName: string,
  tablePartitionKey: string
) {
  const dynamoDBClient = DynamoDBDocumentClient.from(new DynamoDBClient());
  const existingHashes = await fetchSeenOffersSet(
    dynamoDBClient,
    tableName,
    tablePartitionKey
  );
  console.log(
    `[Info] Fetched ${existingHashes.size} existing hashes for partition "${tablePartitionKey}"`
  );

  const newHashes: string[] = [];
  const newOffers: HashedOffer[] = [];

  for (const incomingOffer of parsedOffers) {
    if (!existingHashes.has(incomingOffer.hash)) {
      newHashes.push(incomingOffer.hash);
      newOffers.push(incomingOffer);
    }
  }

  console.log(`[Info] Found ${newOffers.length} new offers`);

  await writeSeenOffersSet(
    dynamoDBClient,
    tableName,
    tablePartitionKey,
    existingHashes,
    newHashes
  );
  console.log(`[Info] Wrote ${newHashes.length} new offers`);
}
