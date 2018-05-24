import { createLocale } from "./utils";
import { generateConcepts } from "./generateConcepts";
import { ConceptContainerHelper } from "@textactor/concept-domain";

let [, , localeArg] = process.argv;

if (!localeArg || localeArg.length !== 5) {
    throw new Error(`'locale' arg is invalid: ${localeArg}`);
}

const locale = createLocale(localeArg.split('-')[0], localeArg.split('-')[1]);
const container = ConceptContainerHelper.build({ ownerId: 'eu', name: 'test', uniqueName: 'test', ...locale });

generateConcepts(container)
    .then(total => console.log(`DONE! Saved ${total} concepts`))
    .catch(error => console.error(error));
