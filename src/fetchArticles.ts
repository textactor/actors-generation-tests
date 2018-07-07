
const debug = require('debug')('actors-generation');

import { Locale, createLocale, ensureDirExists } from "./utils";
import { join } from "path";
import { formatArticlesDir } from "./data";
import { writeFile } from "fs";
const articleScrape = require('ascrape');

export type FetchArticlesOptions = {
    lang: string
    country: string
    urlFormat: string
    startId: number
    endId: number
}

export async function fetchArticles(options: FetchArticlesOptions): Promise<number> {

    if (!options || !options.startId || !options.endId || options.startId >= options.endId || typeof options.urlFormat !== 'string' || options.urlFormat.indexOf('ID') < 0) {
        return Promise.reject(new Error(`Invalid options: ${JSON.stringify(options)}`));
    }

    const locale = createLocale(options.lang, options.country);
    const urlFormat = options.urlFormat;
    const startId = options.startId;
    const endId = options.endId;

    const ids: number[] = [];
    for (let id = startId; id <= endId; id++) {
        ids.push(id);
    }

    let total = 0;

    const dir = formatArticlesDir(locale);

    ensureDirExists(dir);

    for (let id of ids) {
        await processId(locale, id, urlFormat).then(done => done && total++)
    }

    return total;
}

function processId(locale: Locale, id: number, urlFormat: string): Promise<boolean> {
    const url = urlFormat.replace(/ID/g, id.toString());

    return fetchUrl(url, id).then(article => saveArticle(article, locale));
}

function saveArticle(article: WebArticle, locale: Locale): Promise<boolean> {
    if (!article || !article.content) {
        return Promise.resolve(false);
    }

    const file = join(formatArticlesDir(locale), `${article.id}.json`);

    return new Promise((resolve, reject) => {
        writeFile(file, JSON.stringify(article), 'utf8', (error?: Error) => {
            if (error) {
                reject(error)
            } else {
                resolve(true);
            }
        })
    });
}

function fetchUrl(url: string, id: number): Promise<WebArticle> {
    debug(`getting url: ${url}`)
    return new Promise<WebArticle>((resolve, reject) => {
        articleScrape(url, (error: Error, data: any) => {
            if (error) {
                reject(error);
            } else {
                const article: WebArticle = data && data.content && { id, title: data.title, content: data.content.text() };
                resolve(article);
            }
        })
    })
        .catch(error => {
            debug(error.message);
            return null;
        });
}

export type WebArticle = {
    id: number
    title: string
    content: string
}
