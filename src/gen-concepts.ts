import { createLocale } from "./utils";
import { generateConcepts } from "./generateConcepts";

let [, , localeArg] = process.argv;

if (!localeArg || localeArg.length !== 5) {
    throw new Error(`'locale' arg is invalid: ${localeArg}`);
}

const locale = createLocale(localeArg.split('-')[0], localeArg.split('-')[1]);

generateConcepts({ lang: locale.lang, country: locale.country })
    .then(total => console.log(`DONE! Saved ${total} concepts`))
    .catch(error => console.error(error));
