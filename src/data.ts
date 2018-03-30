import { Locale } from "./utils";
import { join } from "path";

export function formatArticlesDir(locale: Locale) {
    return join(formatDataDir(locale), 'articles');
}

export function formatConceptsFile(locale: Locale) {
    return join(formatDataDir(locale), 'concepts.json');
}

export function formatWikiEntitiesFile(locale: Locale) {
    return join(formatDataDir(locale), 'wiki-entities.json');
}

export function formatWikiSearchNamesFile(locale: Locale) {
    return join(formatDataDir(locale), 'wiki-search-names.json');
}

export function formatWikiTitlesFile(locale: Locale) {
    return join(__dirname, `../data`, `${locale.lang}-wiki-titles.json`);
}

export function formatActorsFile(locale: Locale) {
    return join(formatDataDir(locale), 'actors.json');
}

export function formatConceptActorsFile(locale: Locale) {
    return join(formatDataDir(locale), 'concept-actors.json');
}

export function formatDataDir(locale: Locale): string {
    return join(__dirname, `../data/${locale.lang}-${locale.country}`);
}
