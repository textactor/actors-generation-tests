
import { existsSync } from "fs";
const mkdirp = require('mkdirp');

export type Locale = {
    lang: string
    country: string
}

export function ensureDirExists(dir: string) {
    if (!existsSync(dir)) {
        mkdirp.sync(dir);
    }
}

export function createLocale(lang: string, country: string): Locale {
    lang = lang && lang.trim().toLowerCase();
    country = country && country.trim().toLowerCase();
    if (!isValidLang(lang)) {
        throw new Error(`language is invalid: ${lang}`);
    }
    if (!isValidCountry(country)) {
        throw new Error(`country is invalid: ${country}`);
    }

    return { lang, country };
}

export function isValidCountry(country: string) {
    return isValidLang(country);
}

export function isValidLang(lang: string) {
    return lang && lang.length === 2 && /^[a-z]{2}$/.test(lang);
}