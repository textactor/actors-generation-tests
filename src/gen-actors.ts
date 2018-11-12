
require('dotenv').config();

import { createLocale } from "./utils";
import { generateActors } from "./generateActors";
import { formatArticlesDir } from "./data";
import { readdirSync, readFile } from "fs";
import { join } from "path";
import { WebArticle } from "./fetchArticles";

import {
    MemoryConceptContainerRepository,
    MemoryConceptRepository,
} from '@textactor/concept-domain/dest/repositories/memory';

import { createExplorer } from "@textactor/actors-explorer";
import { FileWikiTitleRepository } from "./fileWikiTitleRepository";
import { FileWikiEntityRepository } from "./fileWikiEntityRepository";
import { FileWikiSearchNameRepository } from "./fileWikiSearchNameRepository";

let [, , localeArg] = process.argv;

if (!localeArg || localeArg.length !== 5) {
    throw new Error(`'locale' arg is invalid: ${localeArg}`);
}

const locale = createLocale(localeArg.split('-')[0], localeArg.split('-')[1]);

const conceptRep = new MemoryConceptRepository();
const containerRep = new MemoryConceptContainerRepository();
const wikiTitleRep = new FileWikiTitleRepository(locale);
const entityRep = new FileWikiEntityRepository(locale);
const searchNameRep = new FileWikiSearchNameRepository(locale);

const explorer = createExplorer({
    containerRep,
    conceptRep,
    wikiTitleRep,
    entityRep,
    searchNameRep,
})

loadConcepts()
    .then(container => generateActors(explorer, container))
    .then(() => console.log(`DONE! Saved actors`))
    .catch(error => console.error(error))
    .then(() => {
        return Promise.all([
            wikiTitleRep.close(),
            entityRep.close(),
            searchNameRep.close(),
        ])
    });

async function loadConcepts() {
    let container = await explorer.createCollector({ name: 'test', uniqueName: 'test', ownerId: 'ournet', ...locale });

    const dir = formatArticlesDir(locale);
    const files = readdirSync(dir);

    for (let file of files) {
        const text = await getText(join(dir, file));
        await container.pushText(text);
    }

    await container.end();

    await wikiTitleRep.init();
    await entityRep.init();
    await searchNameRep.init();

    return container;
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
