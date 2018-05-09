
require('dotenv').config();

import { createLocale } from "./utils";
import { PushContextConcepts, MemoryConceptRepository, MemoryRootNameRepository, MemoryConceptContainerRepository, ConceptContainerHelper, ConceptContainerStatus } from "@textactor/concept-domain";
import { generateActors } from "./generateActors";
import { formatArticlesDir } from "./data";
import { readdirSync, readFile } from "fs";
import { seriesPromise } from "@textactor/domain";
import { join } from "path";
import { WebArticle } from "./fetchArticles";
import { ConceptCollector } from '@textactor/concept-collector';

let [, , localeArg] = process.argv;

if (!localeArg || localeArg.length !== 5) {
    throw new Error(`'locale' arg is invalid: ${localeArg}`);
}

const locale = createLocale(localeArg.split('-')[0], localeArg.split('-')[1]);

const conceptRepository = new MemoryConceptRepository();
const rootNameRep = new MemoryRootNameRepository();
const containerRep = new MemoryConceptContainerRepository();

loadConcepts()
    .then(container => generateActors(container, containerRep, conceptRepository, rootNameRep))
    .then(() => console.log(`DONE! Saved actors`))
    .catch(error => console.error(error))

async function loadConcepts() {
    const pushConcepts = new PushContextConcepts(conceptRepository, rootNameRep);
    const conceptCollector = new ConceptCollector(pushConcepts);

    let container = ConceptContainerHelper.build({ name: 'test', uniqueName: 'test', ...locale });

    container = await containerRep.create(container);

    const dir = formatArticlesDir(locale);
    const files = readdirSync(dir);

    container = await containerRep.update({ item: { id: container.id, status: ConceptContainerStatus.COLLECTING } });

    try {
        await seriesPromise(files, file => getText(join(dir, file))
            .then(text => conceptCollector.execute({ text, lang: locale.lang, country: locale.country, containerId: container.id })));
    } catch (e) {
        const error = e.message;
        container = await containerRep.update({
            item: {
                id: container.id, status: ConceptContainerStatus.COLLECT_ERROR,
                lastError: error
            }
        });
        return Promise.reject(e);
    }

    container = await containerRep.update({ item: { id: container.id, status: ConceptContainerStatus.COLLECT_DONE } });

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
