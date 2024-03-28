import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import * as Cheerio from "cheerio";
import * as crypto from "crypto";

const BASE = "https://www.kleinanzeigen.de";
const SEARCH = "s-nikon-z";
const DYNAMODB_TABLE_NAME = "SeenOffersV1";
const DYNAMODB_PARTITION_KEY = `kleinanzeigen-${SEARCH}`;
/**
 * The limit on the number of items we store in a hash string in DynamoDB.
 *
 * Derives from the 400KiB DynamoDB item limit divided by 33B (32B hash + `#` separator) and some conservative rounding.
 */
const DYNAMODB_HASH_ITEM_LIMIT = 12_500;

export const handler = async (event: any): Promise<any> => {
  const url = `${BASE}/${SEARCH}/k0`;

  console.log(`[Info] Fetching ${url}`);
  const response = await fetch(url, {
    headers: { "User-Agent": getRandomUserAgent() },
  });

  const body = await response.text();
  console.log(`[Info] Fetched ${body.length} chars for ${url}`);

  if (response.status >= 400) {
    console.error(
      `[Error] Response Status ${response.status} - ${
        body ? body.slice(0, 200) + "..." : "empty body"
      }`
    );
    return 500;
  }

  const parsed = parseOffers(body);
  console.log(`[Info] Found ${parsed.length} offers`);

  const client = new DynamoDBClient();
  const dynamoDb = DynamoDBDocumentClient.from(client);

  const existingHashes = await fetchSeenOffersSet(
    dynamoDb,
    DYNAMODB_PARTITION_KEY
  );
  console.log(
    `[Info] Fetched ${existingHashes.size} existing hashes for partition "${DYNAMODB_PARTITION_KEY}"`
  );

  const incomingHashes: string[] = hashOffers(parsed);
  const newHashes = incomingHashes.filter((hash) => !existingHashes.has(hash));
  console.log(`[Info] Found ${newHashes.length} new offers`);
  await writeSeenOffersSet(
    dynamoDb,
    DYNAMODB_PARTITION_KEY,
    existingHashes,
    newHashes
  );
  console.log(`[Info] Wrote ${newHashes.length} new offers`);

  // todo: send notifications for new offers

  return {
    statusCode: 200,
    body: JSON.stringify(parsed, null, 2),
  };
};

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
  const offers: Offer[] = adItems
    .map((_idx, elem) => {
      const id = elem.attribs["data-adid"].trim();

      // Find thumbnailUrl
      const thumbnailUrl = $(
        `article.aditem[data-adid='${id}'] div.imagebox img`
      )
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
        return null;
      }

      return <Offer>{
        id,
        srcUrl: elem.attribs["data-href"]?.stripText(),
        innerHtml: $(elem).html(),
        thumbnailUrl,
        timestamp,
        location,
        productName,
        description,
        price: price.split("€")[0].trim() + " €",
        priceRaw: price,
        createdAt: now,
      };
    })
    .toArray()
    .filter((o) => !!o);

  return offers;
}

declare global {
  interface String {
    stripText(): string;
    clearNewLines(): string;
  }
}

String.prototype.stripText = function stripText(): string {
  return this.split(" ")
    .filter((a) => a.length)
    .join(" ");
};

String.prototype.clearNewLines = function clearNewLines(): string {
  return this.split("\n")
    .filter((a) => a.length)
    .join(" ");
};

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

function hashOffers(offers: Offer[]): string[] {
  // A unique identity function should be covered by source & id.
  // Once prices change, we do want a notification though.
  return offers.map(({ source, id, priceRaw }) =>
    crypto.createHash("md5").update(`${source}-${id}-${priceRaw}`).digest("hex")
  );
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

  seenOffers.Item;

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
