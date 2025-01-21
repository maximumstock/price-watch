import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { Context } from "aws-lambda";
import * as Cheerio from "cheerio";
import * as crypto from "crypto";

import "../../shared/src/lib.d";
import { InputEvent, validateInputEvent } from "../../shared/src/event";
import { Configuration, readConfigFromEnv } from "../../shared/src/config";
import { Readable, Stream } from "stream";
import { ParquetSchema, ParquetTransformer } from "@dsnp/parquetjs";

/**
 * The limit on the number of items we store in a hash string in DynamoDB.
 *
 * Derives from the 400KiB DynamoDB item limit divided by 33B (32B hash + `#` separator) and some conservative rounding.
 */
const DYNAMODB_HASH_ITEM_LIMIT = 12_000;
const DYNAMODB_TABLE_NAME = "SeenOffersV1";

export const handler = async (
  inputEvent: InputEvent,
  context: Context
): Promise<any> => {
  // Framework part
  const configuration = readConfigFromEnv();
  console.log("New Event:", JSON.stringify(inputEvent, null, 2));
  const event = validateInputEvent(inputEvent);
  const dynamoDBClient = DynamoDBDocumentClient.from(new DynamoDBClient());
  const sesClient = new SESClient({ region: configuration.awsRegion });
  const s3Client = new S3Client();

  // Lambda-specific part
  const { response, body } = await fetchHtml(event.searchQuery);

  if (response.status >= 400) {
    const error = `[Error] Response Status ${response.status} - ${
      body ? body.slice(0, 200) + "..." : "empty body"
    }`;
    console.error(error);
    return;
  }

  const parsedOffers = parseOffers(body);

  const newOffers = await determineNewOffers(
    dynamoDBClient,
    event.searchQuery,
    parsedOffers
  );

  const emailTargets = event.notifications
    .filter((n) => n.type === "email")
    .map((n) => n.targets)
    .flat();
  await sendEmailNotifications(
    configuration,
    sesClient,
    emailTargets,
    newOffers
  );

  if (inputEvent.storeForAnalytics && newOffers.length !== 0) {
    await storeParquetOffersForAnalytics(
      configuration,
      s3Client,
      inputEvent,
      newOffers
    );
  }
};

async function fetchHtml(searchQuery: string) {
  const BASE = "https://www.kleinanzeigen.de";
  const URL = `${BASE}/${searchQuery}/k0`;
  console.log(`[Info] Fetching ${URL}`);

  const response = await fetch(URL, {
    headers: { "User-Agent": getRandomUserAgent() },
  });

  const body = await response.text();
  console.log(`[Info] Fetched ${body.length} chars for ${URL}`);
  return { response, body };
}

async function determineNewOffers(
  dynamoDb: DynamoDBDocumentClient,
  searchQuery: string,
  parsed: Offer[]
) {
  const DYNAMODB_PARTITION_KEY = `kleinanzeigen-${searchQuery}`;
  const existingHashes = await fetchSeenOffersSet(
    dynamoDb,
    DYNAMODB_PARTITION_KEY
  );
  console.log(
    `[Info] Fetched ${existingHashes.size} existing hashes for partition "${DYNAMODB_PARTITION_KEY}"`
  );

  const incomingOffers = hashOffers(parsed);
  const newHashes = incomingOffers
    .filter((e) => !existingHashes.has(e.hash))
    .map(({ hash }) => hash);
  const newOffers = incomingOffers
    .filter((e) => !existingHashes.has(e.hash))
    .map(({ offer }) => offer);
  console.log(`[Info] Found ${newOffers.length} new offers`);

  await writeSeenOffersSet(
    dynamoDb,
    DYNAMODB_PARTITION_KEY,
    existingHashes,
    newHashes
  );
  console.log(`[Info] Wrote ${newHashes.length} new offers`);

  return newOffers;
}

async function sendEmailNotifications(
  configuration: Configuration,
  sesClient: SESClient,
  destinationEmails: string[],
  newOffers: Offer[]
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
                  <a href="${o.srcUrl}" target="_blank">${o.productName}<a>&nbsp;${o.description} - ${o.priceRaw} - ${o.location} - ${o.timestamp}
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

function getRandomUserAgent(): string {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/86.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/86.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/86.0 Safari/537.36",
  ];

  const randomIndex = Math.floor(Math.random() * userAgents.length);
  return userAgents[randomIndex];
}

export function parseOffers(rawBody: string): Offer[] {
  const body =
    (rawBody && typeof rawBody === "string" && rawBody?.trim()) || "";

  if (!body) {
    throw new Error("empty body");
  }

  const $ = Cheerio.load(body);
  const adItems = $("ul#srchrslt-adtable li.ad-listitem article.aditem").slice(
    0,
    100
  );

  const now = new Date();
  const offers: Offer[] = [];

  adItems.toArray().forEach((elem, _idx) => {
    const id = elem.attribs["data-adid"].trim();

    // Find thumbnailUrl
    const thumbnailUrl = $(`article.aditem[data-adid='${id}'] div.imagebox img`)
      .first()
      .get(0)
      ?.attribs["src"].trim()
      .stripText();

    // Find location
    const location = $(
      `article.aditem[data-adid='${id}'] div.aditem-main--top--left`
    )
      .text()
      .trim()
      .stripText();

    // Find timestamp
    const timestamp = $(
      `article.aditem[data-adid='${id}'] div.aditem-main--top--right`
    )
      .text()
      .trim()
      .stripText();

    // Find product
    const productName = $(
      `article.aditem[data-adid='${id}'] div.aditem-main--middle h2`
    )
      .text()
      .trim()
      .clearNewLines()
      .stripText();

    // Find description
    const description = $(
      `article.aditem[data-adid='${id}'] div.aditem-main--middle p.aditem-main--middle--description`
    )
      .text()
      .trim()
      .stripText();

    // Find price
    const price = $(
      `article.aditem[data-adid='${id}'] div.aditem-main--middle div.aditem-main--middle--price-shipping`
    )
      .text()
      .trim()
      .stripText();

    // We probably hit some separator elements here
    if (
      [
        thumbnailUrl,
        location,
        timestamp,
        productName,
        description,
        price,
      ].every((e) => !e)
    ) {
      return;
    }

    const priceRaw = price.split("€")[0].trim();

    offers.push({
      id,
      srcUrl: `https://kleinanzeigen.de${elem.attribs[
        "data-href"
      ]?.stripText()}`,
      innerHtml: $(elem).html()!,
      thumbnailUrl,
      timestamp,
      location,
      productName,
      description,
      price: `${priceRaw} €`,
      priceRaw: price,
      createdAt: now,
      source: "kleinanzeigen",
    });
  });

  console.log(`[Info] Found ${offers.length} offers`);

  return offers.filter(
    (o) => o.description && o.productName && o.price && o.createdAt
  );
}

type Url = string;

interface Offer {
  id: string;
  innerHtml: string;
  srcUrl: Url;
  thumbnailUrl?: Url;
  location: string;
  productName: string;
  description: string;
  price: string;
  priceRaw: string;
  timestamp: string;
  // Metadata
  createdAt: Date;
  source: "kleinanzeigen";
}

function hashOffers(offers: Offer[]): { hash: string; offer: Offer }[] {
  // A unique identity function should be covered by source & id.
  // Once prices change, we do want a notification though.
  return offers.map((offer) => ({
    hash: crypto
      .createHash("md5")
      .update(`${offer.source}-${offer.id}-${offer.priceRaw}`)
      .digest("hex"),
    offer,
  }));
}

/**
 * Combine existing and new hashes into a new hash string and write it to
 * DynamoDB table `SeenOffersV1` for the given partition key.
 */
async function writeSeenOffersSet(
  dynamoDb: DynamoDBDocumentClient,
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
      TableName: DYNAMODB_TABLE_NAME,
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
  partitionKey: string
): Promise<Set<string>> {
  const seenOffers = await dynamoDb.send(
    new GetCommand({
      TableName: DYNAMODB_TABLE_NAME,
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

  return seenOffers.Item?.Value.split("#").reduce((acc, hash) => {
    acc.add(hash);
    return acc;
  }, new Set<string>());
}

function notifySqs(sqsClient: any, newOffers: Offer[]) {
  throw new Error("Function not implemented.");
}

async function storeParquetOffersForAnalytics(
  configuration: Configuration,
  s3Client: S3Client,
  inputEvent: InputEvent,
  newOffers: Offer[]
) {
  console.log(`[Info] Beginning analytics parquet storage dump...`);
  const parquetSchema = new ParquetSchema({
    id: { type: "UTF8", compression: "SNAPPY" },
    innerHtml: { type: "UTF8", compression: "SNAPPY" },
    srcUrl: { type: "UTF8", compression: "SNAPPY" },
    thumbnailUrl: { type: "UTF8", compression: "SNAPPY" },
    location: { type: "UTF8", compression: "SNAPPY" },
    productName: { type: "UTF8", compression: "SNAPPY" },
    description: { type: "UTF8", compression: "SNAPPY" },
    price: { type: "UTF8", compression: "SNAPPY" },
    priceRaw: { type: "UTF8", compression: "SNAPPY" },
    timestamp: { type: "UTF8", compression: "SNAPPY" },
    createdAt: { type: "TIMESTAMP_MILLIS", compression: "SNAPPY" },
    source: { type: "UTF8", compression: "SNAPPY" },
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
