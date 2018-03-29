import { createLocale } from "./utils";
import { fetchArticles } from "./fetchArticles";

let [, , localeArg, startIdArg, endIdArg, urlFormat] = process.argv;

if (!localeArg || localeArg.length !== 5) {
    throw new Error(`'locale' arg is invalid: ${localeArg}`);
}

if (!urlFormat) {
    throw new Error(`'url' arg is invalid: ${urlFormat}`);
}

const locale = createLocale(localeArg.split('-')[0], localeArg.split('-')[1]);

const startId = parseInt(startIdArg);
const endId = parseInt(endIdArg);

if (!Number.isSafeInteger(startId)) {
    throw new Error(`startId is invalid`);
}

if (!Number.isSafeInteger(endId)) {
    throw new Error(`endId is invalid`);
}

fetchArticles({ lang: locale.lang, country: locale.country, startId, endId, urlFormat })
    .then(total => console.log(`DONE! Saved ${total} articles`))
    .catch(error => console.error(error));
