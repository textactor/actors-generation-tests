
require('dotenv').config();

import { createLocale } from "./utils";
import { parse as parseConcepts } from 'concepts-parser';
import { Locale, Concept, PushContextConcepts, ConceptHelper } from "@textactor/concept-domain";
import { generateActors } from "./generateActors";
import { formatArticlesDir } from "./data";
import { readdirSync, readFile } from "fs";
import { seriesPromise } from "@textactor/domain";
import { join } from "path";
import { WebArticle } from "./fetchArticles";
import { FileConceptRepository } from "./fileConceptRepository";

let [, , localeArg] = process.argv;

if (!localeArg || localeArg.length !== 5) {
    throw new Error(`'locale' arg is invalid: ${localeArg}`);
}

const locale = createLocale(localeArg.split('-')[0], localeArg.split('-')[1]);

const conceptRepository = new FileConceptRepository(locale);

loadConcepts()
    .then(() => generateActors(locale, conceptRepository))
    .then(() => console.log(`DONE! Saved actors`))
    .catch(error => console.error(error))
    .then(() => conceptRepository.close());

function loadConcepts() {
    const pushConcepts = new PushContextConcepts(conceptRepository);

    const dir = formatArticlesDir(locale);
    const files = readdirSync(dir);

    return seriesPromise(files, file => getConcepts(join(dir, file), locale).then(concepts => pushConcepts.execute(concepts)))
}

function getConcepts(file: string, locale: Locale): Promise<Concept[]> {
    return getText(file).then(text => {
        const concepts = parseConcepts({ text, ...locale }, { mode: 'collect' });
        const list: Concept[] = [];
        for (let concept of concepts) {
            list.push(ConceptHelper.create({ text: concept.value, abbr: concept.abbr, ...locale }));
        }

        return list;
    });
}

function getText(file: string): Promise<string> {
    return new Promise((resolve, reject) => {
        readFile(file, 'utf8', (error, data) => {
            if (error) {
                reject(error);
            } else {
                const article: WebArticle = JSON.parse(data);
                resolve([article.title.trim(), article.content.trim()].join('\n'));
            }
        })
    })
}
