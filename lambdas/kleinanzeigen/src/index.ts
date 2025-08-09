import { createAWSLambdaHandler } from "../../shared/src/platform";
import { handlerKleinanzeigen } from "./handler";

export const handler = createAWSLambdaHandler(handlerKleinanzeigen);
