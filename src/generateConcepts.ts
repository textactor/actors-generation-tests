
import { parse as parseConcepts } from 'concepts-parser';
import { Locale } from './utils';
import { readdirSync, readFile } from 'fs';
import { formatArticlesDir } from './data';
import { WebArticle } from './fetchArticles';
import { seriesPromise } from '@textactor/domain';
import {
    Concept,
    ConceptHelper,
    PushContextConcepts,
    DeleteUnpopularConcepts,
    MemoryRootNameRepository,
    MemoryConceptRepository,
} from '@textactor/concept-domain';
import { join } from 'path';

export function generateConcepts(locale: Locale): Promise<number> {
    const dir = formatArticlesDir(locale);
    const files = readdirSync(dir);

    const conceptRepository = new MemoryConceptRepository();
    const rootNameRep = new MemoryRootNameRepository();

    const pushConcepts = new PushContextConcepts(conceptRepository, rootNameRep);
    const deleteUnpopularConcepts = new DeleteUnpopularConcepts(locale, conceptRepository, rootNameRep);

    const processOptions = {
        minConceptPopularity: 2,
        minAbbrConceptPopularity: 4,
        minOneWordConceptPopularity: 4,
        minRootConceptPopularity: 10,
        minRootAbbrConceptPopularity: 14,
        minRootOneWordConceptPopularity: 14,
    };

    return seriesPromise(files, file => getConcepts(join(dir, file), locale).then(concepts => pushConcepts.execute(concepts)))
        .then(() => conceptRepository.count(locale))
        .then(totalConcepts => console.log(`concepts before deleting: ${totalConcepts}`))
        .then(() => deleteUnpopularConcepts.execute(processOptions))
        .then(() => conceptRepository.count(locale));
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
