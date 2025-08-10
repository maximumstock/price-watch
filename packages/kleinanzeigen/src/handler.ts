import * as Cheerio from "cheerio";
import * as crypto from "crypto";

import {
  HashedOffer,
  LambdaInput,
  LambdaResult,
  OfferSource,
} from "../../shared/src/lambda";
import { LambdaHandler, Offer } from "../../shared/src/lambda";
import { cleanString, getRandomUserAgent } from "../../shared/src/common";
import { DYNAMODB_TABLE_NAME } from "../../shared/src/platform";

export const handlerKleinanzeigen: LambdaHandler = async (
  inputEvent: LambdaInput
): Promise<LambdaResult> => {
  const DYNAMODB_TABLE_PARTITION_KEY = `${OfferSource.KLEINANZEIGEN}-${inputEvent.searchQuery}`;

  const { response, body } = await fetchHtml(inputEvent.searchQuery);

  if (response.status >= 400) {
    const error = `[Error] Response Status ${response.status} - ${
      body ? body.slice(0, 200) + "..." : "empty body"
    }`;
    console.error(error);
    return {
      parsedOffers: [],
      offerStore: {
        type: "dynamodb",
        tableName: DYNAMODB_TABLE_NAME,
        tablePartitionKey: DYNAMODB_TABLE_PARTITION_KEY,
      },
    };
  }

  const parsedOffers = parseOffers(body);

  return {
    parsedOffers: hashOffers(parsedOffers),
    offerStore: {
      type: "dynamodb",
      tableName: DYNAMODB_TABLE_NAME,
      tablePartitionKey: DYNAMODB_TABLE_PARTITION_KEY,
    },
  };
};

/**
 * A unique identity function should be covered by source & id.
 * Once prices change, we do want a notification though.
 */
function hashOffers(offers: Offer[]): HashedOffer[] {
  return offers.map((offer) => {
    const hash = crypto
      .createHash("md5")
      .update(`${offer.source}-${offer.id}-${offer.raw.priceRaw}`)
      .digest("hex");

    return { ...offer, hash };
  });
}

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

export function parseOffers(rawBody: string): Offer[] {
  const stripWhitespaceRegExp = new RegExp(/\s/gm);
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
    const id = elem.attribs["data-adid"]?.trim();

    // Find thumbnailUrl
    const thumbnailUrl = $(`article.aditem[data-adid='${id}'] div.imagebox img`)
      ?.first()
      ?.get(0)
      ?.attribs["src"]?.trim()
      ?.replaceAll(stripWhitespaceRegExp, " ");

    // Find location
    const location = $(
      `article.aditem[data-adid='${id}'] div.aditem-main--top--left`
    )
      ?.text()
      ?.trim()
      ?.replaceAll(stripWhitespaceRegExp, " ");

    // Find timestamp
    const timestamp = $(
      `article.aditem[data-adid='${id}'] div.aditem-main--top--right`
    )
      ?.text()
      ?.trim()
      ?.replaceAll(stripWhitespaceRegExp, " ");

    // Find product
    const productName = $(
      `article.aditem[data-adid='${id}'] div.aditem-main--middle h2`
    )
      ?.text()
      ?.trim()
      // .clearNewLines()
      ?.replaceAll(stripWhitespaceRegExp, " ");

    // Find description
    const description = $(
      `article.aditem[data-adid='${id}'] div.aditem-main--middle p.aditem-main--middle--description`
    )
      ?.text()
      ?.trim()
      ?.replaceAll(stripWhitespaceRegExp, " ");

    // Find price
    const priceRaw = $(
      `article.aditem[data-adid='${id}'] div.aditem-main--middle div.aditem-main--middle--price-shipping`
    )
      ?.text()
      ?.trim()
      ?.replaceAll(stripWhitespaceRegExp, " ");

    // We probably hit some separator elements here
    if (
      [
        thumbnailUrl,
        location,
        timestamp,
        productName,
        description,
        priceRaw,
      ].every((e) => !e)
    ) {
      return;
    }

    const priceWithoutCurrency = priceRaw.split("€")[0].trim();

    offers.push({
      id,
      srcUrl: `https://kleinanzeigen.de${elem.attribs["data-href"]}`,
      raw: {
        priceRaw: cleanString(priceRaw),
        innerHtml: $(elem).html()!,
      },
      thumbnailUrl,
      timestamp,
      location: cleanString(location),
      productName: cleanString(productName),
      description: cleanString(description),
      price: priceWithoutCurrency,
      createdAt: now,
      source: OfferSource.KLEINANZEIGEN,
    });
  });

  console.log(`[Info] Found ${offers.length} offers`);

  return offers.filter(
    (o) => o.description && o.productName && o.price && o.createdAt
  );
}
