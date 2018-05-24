
import { ConceptCollector } from '@textactor/concept-collector';
import { Locale } from './utils';
import { readdirSync, readFile } from 'fs';
import { formatArticlesDir } from './data';
import { WebArticle } from './fetchArticles';
import { seriesPromise } from '@textactor/domain';
import {
    PushContextConcepts,
    DeleteUnpopularConcepts,
    MemoryRootNameRepository,
    MemoryConceptRepository,
    ConceptContainer,
} from '@textactor/concept-domain';
import { join } from 'path';
import { KnownNameService } from '@textactor/known-names';

export function generateConcepts(container: ConceptContainer): Promise<number> {
    const locale: Locale = { lang: container.lang, country: container.country };
    const dir = formatArticlesDir(locale);
    const files = readdirSync(dir);

    const conceptRepository = new MemoryConceptRepository();
    const rootNameRep = new MemoryRootNameRepository();

    const pushConcepts = new PushContextConcepts(conceptRepository, rootNameRep);
    const conceptCollect = new ConceptCollector(pushConcepts, new KnownNameService());
    const deleteUnpopularConcepts = new DeleteUnpopularConcepts(container, conceptRepository, rootNameRep);

    const processOptions = {
        minConceptPopularity: 2,
        minAbbrConceptPopularity: 4,
        minOneWordConceptPopularity: 4,
        minRootConceptPopularity: 10,
        minRootAbbrConceptPopularity: 14,
        minRootOneWordConceptPopularity: 14,
    };

    return seriesPromise(files, file => getText(join(dir, file))
        .then(text => conceptCollect.execute({ text, lang: locale.lang, country: locale.country, containerId: container.id })))
        .then(() => conceptRepository.count(locale))
        .then(totalConcepts => console.log(`concepts before deleting: ${totalConcepts}`))
        .then(() => deleteUnpopularConcepts.execute(processOptions))
        .then(() => conceptRepository.count(locale));
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
