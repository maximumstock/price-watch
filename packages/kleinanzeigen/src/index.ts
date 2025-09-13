import { lambdaBuilder } from "../../shared/src/platform";
import { handlerKleinanzeigen } from "./handler";

export const handler = lambdaBuilder(handlerKleinanzeigen);
