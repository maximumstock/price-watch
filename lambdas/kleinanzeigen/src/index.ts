import * as Cheerio from "cheerio";

const BASE = "https://www.kleinanzeigen.de";
const SEARCH = "s-nikon-z";

export const handler = async (event: any): Promise<any> => {
  const url = `${BASE}/${SEARCH}/k0`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": generateUserAgent(),
    },
  });

  const body = await response.text();

  if (response.status >= 400) {
    console.error(
      `[Error] Response Status ${response.status} - ${
        body ? body.slice(0, 200) + "..." : "empty body"
      }`
    );
    return 500;
  }

  const parsed = parseOffers(body);

  return {
    statusCode: 200,
    body: JSON.stringify(parsed, null, 2),
  };
};

function generateUserAgent(): string {
  return "User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:58.0) Gecko/20100101 Firefox/58.0";
}

export function parseOffers(rawBody: string): Offer[] {
  const body =
    (rawBody && typeof rawBody === "string" && rawBody?.trim()) || "";

  if (!body) {
    throw new Error("empty body");
  }

  const $ = Cheerio.load(body);
  const adItems = $("ul#srchrslt-adtable li.ad-listitem article.aditem");

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
