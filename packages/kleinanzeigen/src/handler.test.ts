import fs from "fs";
import {
  HashedOffer,
  HashedOfferSchema,
  LambdaInput,
  OfferSource,
} from "../../shared/src/lambda";
import { handlerKleinanzeigen, parseOffers } from "./handler";

describe("kleinanzeigen", () => {
  const fixture: string = fs
    .readFileSync("./fixtures/nikon-z-germany.html")
    .toString();

  describe("parseOffers", () => {
    it("should parse offers from raw search result HTML", () => {
      const offers = parseOffers(fixture);
      expect(Array.isArray(offers)).toEqual(true);
      expect(offers).toHaveLength(25);
      expect(offers.slice(0, 5)).toEqual([
        {
          id: "2702467055",
          srcUrl:
            "https://kleinanzeigen.de/s-anzeige/fotodiox-adapter-sony-e-nikon-z/2702467055-245-21222",
          thumbnailUrl:
            "https://img.kleinanzeigen.de/api/v1/prod-ads/images/fa/fabeb62f-8995-46a2-b521-0c122d1a7f61?rule=$_2.JPG",
          timestamp: "Heute, 15:28",
          location: "17322 Blankensee Vorpommern",
          productName: "Fotodiox Adapter Sony E -> Nikon Z",
          description:
            "Zum Verkauf steht ein einfacher Adapter zum Anschluss von Sony E-Mount-Objektiven an Nikon...",
          price: "15",
          raw: {
            innerHtml:
              '\n                                            <div class="aditem-image">\n                                                <a href="/s-anzeige/fotodiox-adapter-sony-e-nikon-z/2702467055-245-21222">\n                                                    <div class="imagebox srpimagebox">\n                                                        <img src="https://img.kleinanzeigen.de/api/v1/prod-ads/images/fa/fabeb62f-8995-46a2-b521-0c122d1a7f61?rule=$_2.JPG" srcset="https://img.kleinanzeigen.de/api/v1/prod-ads/images/fa/fabeb62f-8995-46a2-b521-0c122d1a7f61?rule=$_35.JPG" alt="Fotodiox Adapter Sony E -> Nikon Z Mecklenburg-Vorpommern - Blankensee Vorpommern Vorschau" fetchpriority="high" loading="eager">\n                                                    </div>\n                                                </a>\n                                            </div>\n                                            <div class="aditem-main">\n                                                <div class="aditem-main--top">\n                                                    <div class="aditem-main--top--left">\n                                                        <i class="icon icon-small icon-pin-gray"></i> 17322 Blankensee\n                                                        Vorpommern\n                                                    </div>\n                                                    <div class="aditem-main--top--right">\n                                                        <i class="icon icon-small icon-calendar-open"></i>\n                                                        Heute, 15:28\n                                                    </div>\n                                                </div>\n                                                <div class="aditem-main--middle">\n                                                    <h2 class="text-module-begin">\n                                                        <a class="ellipsis" href="/s-anzeige/fotodiox-adapter-sony-e-nikon-z/2702467055-245-21222">Fotodiox\n                                                            Adapter Sony E -&gt; Nikon Z</a>\n                                                    </h2>\n                                                    <p class="aditem-main--middle--description">Zum Verkauf steht ein\n                                                        einfacher Adapter zum Anschluss von Sony E-Mount-Objektiven an\n                                                        Nikon...</p>\n                                                    <div class="aditem-main--middle--price-shipping">\n                                                        <p class="aditem-main--middle--price-shipping--price">\n                                                            15 €</p>\n                                                        <p class="aditem-main--middle--price-shipping--shipping">\n                                                            Versand möglich</p>\n                                                    </div>\n                                                </div>\n                                                <div class="aditem-main--bottom">\n                                                    <p class="text-module-end">\n                                                        <span class="simpletag">Direkt kaufen</span>\n                                                    </p>\n                                                </div>\n                                            </div>\n                                        ',
            priceRaw: "15 € Versand möglich",
          },
          createdAt: expect.any(Date),
          source: OfferSource.KLEINANZEIGEN,
        },
        {
          id: "2702445191",
          srcUrl:
            "https://kleinanzeigen.de/s-anzeige/samyang-mf-85-mm-f-1-4-z-fuer-nikon-z/2702445191-245-384",
          raw: {
            innerHtml:
              '\n                                            <div class="aditem-image">\n                                                <a href="/s-anzeige/samyang-mf-85-mm-f-1-4-z-fuer-nikon-z/2702445191-245-384">\n                                                    <div class="imagebox srpimagebox">\n                                                        <img src="https://img.kleinanzeigen.de/api/v1/prod-ads/images/69/699793bc-f393-4af5-bead-fdc628191c96?rule=$_2.JPG" srcset="https://img.kleinanzeigen.de/api/v1/prod-ads/images/69/699793bc-f393-4af5-bead-fdc628191c96?rule=$_35.JPG" alt="Samyang MF 85 mm F 1.4 Z für Nikon Z Saarbrücken-West - Burbach Vorschau" fetchpriority="high" loading="eager">\n                                                        <div class="galleryimage--counter">\n                                                            3</div>\n                                                    </div>\n                                                </a>\n                                            </div>\n                                            <div class="aditem-main">\n                                                <div class="aditem-main--top">\n                                                    <div class="aditem-main--top--left">\n                                                        <i class="icon icon-small icon-pin-gray"></i> 66115 Burbach\n                                                    </div>\n                                                    <div class="aditem-main--top--right">\n                                                        <i class="icon icon-small icon-calendar-open"></i>\n                                                        Heute, 15:16\n                                                    </div>\n                                                </div>\n                                                <div class="aditem-main--middle">\n                                                    <h2 class="text-module-begin">\n                                                        <a class="ellipsis" href="/s-anzeige/samyang-mf-85-mm-f-1-4-z-fuer-nikon-z/2702445191-245-384">Samyang\n                                                            MF 85 mm F 1.4 Z für Nikon Z</a>\n                                                    </h2>\n                                                    <p class="aditem-main--middle--description">Portrait objektiv für\n                                                        Nikon Z\n                                                        Zustand ist sehr gut.\n                                                        Grund für den Verkauf: Ich habe ein...</p>\n                                                    <div class="aditem-main--middle--price-shipping">\n                                                        <p class="aditem-main--middle--price-shipping--price">\n                                                            250 €</p>\n                                                    </div>\n                                                    <div class="aditem-main--bottom">\n                                                        <p class="text-module-end">\n                                                        </p>\n                                                    </div>\n                                                </div>\n                                        </div>',
            priceRaw: "250 €",
          },
          thumbnailUrl:
            "https://img.kleinanzeigen.de/api/v1/prod-ads/images/69/699793bc-f393-4af5-bead-fdc628191c96?rule=$_2.JPG",
          timestamp: "Heute, 15:16",
          location: "66115 Burbach",
          productName: "Samyang MF 85 mm F 1.4 Z für Nikon Z",
          description:
            "Portrait objektiv für Nikon Z Zustand ist sehr gut. Grund für den Verkauf: Ich habe ein...",
          price: "250",
          createdAt: expect.any(Date),
          source: OfferSource.KLEINANZEIGEN,
        },
        {
          id: "2702442738",
          srcUrl:
            "https://kleinanzeigen.de/s-anzeige/schneider-kreuznach-pc-ts-50mm-f2-8-canon-ef-sony-e-nikon-z/2702442738-245-21222",
          raw: {
            innerHtml:
              '\n                                            <div class="aditem-image">\n                                                <a href="/s-anzeige/schneider-kreuznach-pc-ts-50mm-f2-8-canon-ef-sony-e-nikon-z/2702442738-245-21222">\n                                                    <div class="imagebox srpimagebox">\n                                                        <img src="https://img.kleinanzeigen.de/api/v1/prod-ads/images/c0/c09a087d-1488-438a-86df-b13ec3cdcbe9?rule=$_2.JPG" srcset="https://img.kleinanzeigen.de/api/v1/prod-ads/images/c0/c09a087d-1488-438a-86df-b13ec3cdcbe9?rule=$_35.JPG" alt="Schneider-Kreuznach PC-TS 50mm f2.8 Canon EF / Sony E / Nikon Z Mecklenburg-Vorpommern - Blankensee Vorpommern Vorschau" fetchpriority="high" loading="eager">\n                                                        <div class="galleryimage--counter">\n                                                            6</div>\n                                                    </div>\n                                                </a>\n                                            </div>\n                                            <div class="aditem-main">\n                                                <div class="aditem-main--top">\n                                                    <div class="aditem-main--top--left">\n                                                        <i class="icon icon-small icon-pin-gray"></i> 17322 Blankensee\n                                                        Vorpommern\n                                                    </div>\n                                                    <div class="aditem-main--top--right">\n                                                        <i class="icon icon-small icon-calendar-open"></i>\n                                                        Heute, 15:14\n                                                    </div>\n                                                </div>\n                                                <div class="aditem-main--middle">\n                                                    <h2 class="text-module-begin">\n                                                        <a class="ellipsis" href="/s-anzeige/schneider-kreuznach-pc-ts-50mm-f2-8-canon-ef-sony-e-nikon-z/2702442738-245-21222">Schneider-Kreuznach\n                                                            PC-TS 50mm f2.8 Canon EF / Sony E / Nikon Z</a>\n                                                    </h2>\n                                                    <p class="aditem-main--middle--description">Zum Verkauf steht ein\n                                                        Schneider-Kreuznach Tilt-Shift-Objektiv 50mm F2.8 Super Angulon\n                                                        mit...</p>\n                                                    <div class="aditem-main--middle--price-shipping">\n                                                        <p class="aditem-main--middle--price-shipping--price">\n                                                            1.500 €</p>\n                                                        <p class="aditem-main--middle--price-shipping--shipping">\n                                                            Versand möglich</p>\n                                                    </div>\n                                                </div>\n                                                <div class="aditem-main--bottom">\n                                                    <p class="text-module-end">\n                                                        <span class="simpletag">Direkt kaufen</span>\n                                                    </p>\n                                                </div>\n                                            </div>\n                                        ',
            priceRaw: "1.500 € Versand möglich",
          },
          thumbnailUrl:
            "https://img.kleinanzeigen.de/api/v1/prod-ads/images/c0/c09a087d-1488-438a-86df-b13ec3cdcbe9?rule=$_2.JPG",
          timestamp: "Heute, 15:14",
          location: "17322 Blankensee Vorpommern",
          productName:
            "Schneider-Kreuznach PC-TS 50mm f2.8 Canon EF / Sony E / Nikon Z",
          description:
            "Zum Verkauf steht ein Schneider-Kreuznach Tilt-Shift-Objektiv 50mm F2.8 Super Angulon mit...",
          price: "1.500",
          createdAt: expect.any(Date),
          source: OfferSource.KLEINANZEIGEN,
        },
        {
          id: "2702335051",
          srcUrl:
            "https://kleinanzeigen.de/s-anzeige/techart-tze-01-adapter-sony-e-nikon-z/2702335051-245-21222",
          raw: {
            innerHtml:
              '\n                                            <div class="aditem-image">\n                                                <a href="/s-anzeige/techart-tze-01-adapter-sony-e-nikon-z/2702335051-245-21222">\n                                                    <div class="imagebox srpimagebox">\n                                                        <img src="https://img.kleinanzeigen.de/api/v1/prod-ads/images/6e/6e0a12be-c169-4219-8987-9d66f442125a?rule=$_2.JPG" srcset="https://img.kleinanzeigen.de/api/v1/prod-ads/images/6e/6e0a12be-c169-4219-8987-9d66f442125a?rule=$_35.JPG" alt="Techart TZE-01 Adapter Sony E -> Nikon Z Mecklenburg-Vorpommern - Blankensee Vorpommern Vorschau" fetchpriority="low" loading="lazy">\n                                                        <div class="galleryimage--counter">\n                                                            2</div>\n                                                    </div>\n                                                </a>\n                                            </div>\n                                            <div class="aditem-main">\n                                                <div class="aditem-main--top">\n                                                    <div class="aditem-main--top--left">\n                                                        <i class="icon icon-small icon-pin-gray"></i> 17322 Blankensee\n                                                        Vorpommern\n                                                    </div>\n                                                    <div class="aditem-main--top--right">\n                                                        <i class="icon icon-small icon-calendar-open"></i>\n                                                        Heute, 14:14\n                                                    </div>\n                                                </div>\n                                                <div class="aditem-main--middle">\n                                                    <h2 class="text-module-begin">\n                                                        <a class="ellipsis" name="2702335051" href="/s-anzeige/techart-tze-01-adapter-sony-e-nikon-z/2702335051-245-21222">Techart\n                                                            TZE-01 Adapter Sony E -&gt; Nikon Z</a>\n                                                    </h2>\n                                                    <p class="aditem-main--middle--description">Zum Verkauf steht ein\n                                                        Adapter zum Anschluss von Sony-E-Mount-Objektiven an\n                                                        Nikon-Z-Kameras. Der...</p>\n                                                    <div class="aditem-main--middle--price-shipping">\n                                                        <p class="aditem-main--middle--price-shipping--price">\n                                                            125 €</p>\n                                                        <p class="aditem-main--middle--price-shipping--shipping">\n                                                            Versand möglich</p>\n                                                    </div>\n                                                </div>\n                                                <div class="aditem-main--bottom">\n                                                    <p class="text-module-end">\n                                                        <span class="simpletag">Direkt kaufen</span>\n                                                    </p>\n                                                </div>\n                                            </div>\n                                        ',
            priceRaw: "125 € Versand möglich",
          },
          thumbnailUrl:
            "https://img.kleinanzeigen.de/api/v1/prod-ads/images/6e/6e0a12be-c169-4219-8987-9d66f442125a?rule=$_2.JPG",
          timestamp: "Heute, 14:14",
          location: "17322 Blankensee Vorpommern",
          productName: "Techart TZE-01 Adapter Sony E -> Nikon Z",
          description:
            "Zum Verkauf steht ein Adapter zum Anschluss von Sony-E-Mount-Objektiven an Nikon-Z-Kameras. Der...",
          price: "125",
          createdAt: expect.any(Date),
          source: OfferSource.KLEINANZEIGEN,
        },
        {
          id: "2702308261",
          srcUrl:
            "https://kleinanzeigen.de/s-anzeige/nikon-z7-24-70mm-f4-kit/2702308261-245-496",
          thumbnailUrl:
            "https://img.kleinanzeigen.de/api/v1/prod-ads/images/03/03f0125b-fc56-4854-912b-79e5d667a9e2?rule=$_2.JPG",
          timestamp: "Heute, 13:59",
          location: "24768 Rendsburg",
          productName: "Nikon z7 24-70mm F4 Kit",
          description:
            "Moin moin, ich verkaufe hier ein 2 Jahre altes Nikon Z7 Kit Es besteht aus Nikon Z7 FTZ...",
          price: "2.000",
          raw: {
            innerHtml:
              '\n                                            <div class="aditem-image">\n                                                <a href="/s-anzeige/nikon-z7-24-70mm-f4-kit/2702308261-245-496">\n                                                    <div class="imagebox srpimagebox">\n                                                        <img src="https://img.kleinanzeigen.de/api/v1/prod-ads/images/03/03f0125b-fc56-4854-912b-79e5d667a9e2?rule=$_2.JPG" srcset="https://img.kleinanzeigen.de/api/v1/prod-ads/images/03/03f0125b-fc56-4854-912b-79e5d667a9e2?rule=$_35.JPG" alt="Nikon z7 24-70mm F4 Kit Schleswig-Holstein - Rendsburg Vorschau" fetchpriority="low" loading="lazy">\n                                                        <div class="galleryimage--counter">\n                                                            5</div>\n                                                    </div>\n                                                </a>\n                                            </div>\n                                            <div class="aditem-main">\n                                                <div class="aditem-main--top">\n                                                    <div class="aditem-main--top--left">\n                                                        <i class="icon icon-small icon-pin-gray"></i> 24768 Rendsburg\n                                                    </div>\n                                                    <div class="aditem-main--top--right">\n                                                        <i class="icon icon-small icon-calendar-open"></i>\n                                                        Heute, 13:59\n                                                    </div>\n                                                </div>\n                                                <div class="aditem-main--middle">\n                                                    <h2 class="text-module-begin">\n                                                        <a class="ellipsis" name="2702308261" href="/s-anzeige/nikon-z7-24-70mm-f4-kit/2702308261-245-496">Nikon\n                                                            z7 24-70mm F4 Kit</a>\n                                                    </h2>\n                                                    <p class="aditem-main--middle--description">Moin moin, ich verkaufe\n                                                        hier ein 2 Jahre altes Nikon Z7 Kit\n                                                        Es besteht aus\n                                                        Nikon Z7\n                                                        FTZ...</p>\n                                                    <div class="aditem-main--middle--price-shipping">\n                                                        <p class="aditem-main--middle--price-shipping--price">\n                                                            2.000 € VB</p>\n                                                        <p class="aditem-main--middle--price-shipping--shipping">\n                                                            Versand möglich</p>\n                                                    </div>\n                                                </div>\n                                                <div class="aditem-main--bottom">\n                                                    <p class="text-module-end">\n                                                    </p>\n                                                </div>\n                                            </div>\n                                        ',
            priceRaw: "2.000 € VB Versand möglich",
          },
          createdAt: expect.any(Date),
          source: OfferSource.KLEINANZEIGEN,
        },
      ]);
    });
  });

  describe("handlerKleinanzeigen", () => {
    const inputEvent: LambdaInput = {
      searchQuery: "nikon-z",
      notifications: [],
      rateInMinutes: "1",
      storeForAnalytics: false,
      analyticsS3Prefix: "",
    };

    it("should return a 25-item page", async () => {
      const result = await handlerKleinanzeigen(inputEvent);

      expect(result).toBeDefined();
      expect(result.parsedOffers.length).toEqual(25);
    });

    it("should return a LambdaResult with parsed data", async () => {
      const result = await handlerKleinanzeigen(inputEvent);

      expect(result).toBeDefined();
      expect(result.parsedOffers.length > 0).toBeTruthy();

      for (const o of result.parsedOffers) {
        checkParsedOffer(o);
      }
    });
  });
});

const checkParsedOffer = (offer: HashedOffer) => {
  const validationResult = HashedOfferSchema.safeParse(offer);
  expect(validationResult.success).toBeTruthy();
};
