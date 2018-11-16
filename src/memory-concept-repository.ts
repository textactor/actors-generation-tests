
import { MemoryRepository } from './memory-repository';
import { uniqByProperty, uniq } from '@textactor/domain';
import { Concept, ConceptRepository, PopularConceptsOptions, Locale } from '@textactor/concept-domain';

export class MemoryConceptRepository extends MemoryRepository<Concept> implements ConceptRepository {
    constructor() {
        super()
    }

    getMostPopular(containerId: string, limit: number, skip: number, options?: PopularConceptsOptions) {
        options = { ...options };
        const list: Concept[] = [];
        for (let item of this.db.values()) {
            if (item.containerId !== containerId) {
                continue;
            }
            if (options.minCountWords && item.countWords < options.minCountWords) {
                continue;
            }
            if (options.maxCountWords && item.countWords > options.maxCountWords) {
                continue;
            }
            list.push(item);
        }
        return Promise.resolve(list.slice(skip, skip + limit));
    }

    async getByRootNameIds(ids: string[]): Promise<Concept[]> {
        let list: Concept[] = [];

        for (let id of ids) {
            const concepts = await this.getByRootNameId(id);
            list = list.concat(concepts);
        }

        return uniqByProperty(list, 'id');
    }

    count(locale: Locale): Promise<number> {
        let count = 0;
        for (let item of this.db.values()) {
            if (item.country !== locale.country || item.lang !== locale.lang) {
                continue;
            }

            count++;
        }

        return Promise.resolve(count);
    }

    getConceptsWithAbbr(containerId: string): Promise<Concept[]> {
        const list: Concept[] = []
        for (let item of this.db.values()) {
            if (item.containerId === containerId && !item.isAbbr && item.abbr) {
                list.push(item);
            }
        }

        return Promise.resolve(list);
    }

    async deleteByRootNameIds(ids: string[]): Promise<number> {

        const list = await this.getByRootNameIds(ids);
        let count = list.length;
        for (let item of list) {
            this.db.delete(item.id);
        }

        return Promise.resolve(count);
    }

    list(locale: Locale, limit: number, skip?: number): Promise<Concept[]> {
        skip = skip || 0;
        const list: Concept[] = []
        for (let item of this.db.values()) {
            if (item.country !== locale.country || item.lang !== locale.lang) {
                continue;
            }
            list.push(item)
        }

        return Promise.resolve(list.slice(skip, skip + limit));
    }
    async create(data: Concept): Promise<Concept> {
        if (!!this.db.get(data.id)) {
            return this.createOrUpdate(data);
        }
        this.db.set(data.id, { ...{ popularity: 1, createdAt: Date.now() }, ...data });

        const entity = await this.getById(data.id);
        if (!entity) {
            throw new Error(`Entity not found!`)
        }
        return entity;
    }

    getByRootNameId(id: string): Promise<Concept[]> {
        const list: Concept[] = []
        for (let item of this.db.values()) {
            if (~item.rootNameIds.indexOf(id)) {
                list.push(item)
            }
        }

        return Promise.resolve(list);
    }
    deleteUnpopular(containerId: string, popularity: number): Promise<number> {
        let count = 0;
        for (let item of this.db.values()) {
            if (item.containerId !== containerId) {
                continue;
            }
            if (item.popularity <= popularity) {
                this.db.delete(item.id) && count++;
            }
        }

        return Promise.resolve(count);
    }
    deleteUnpopularAbbreviations(containerId: string, popularity: number): Promise<number> {
        let count = 0;
        for (let item of this.db.values()) {
            if (item.containerId !== containerId) {
                continue;
            }
            if (item.isAbbr && item.popularity <= popularity) {
                this.db.delete(item.id) && count++;
            }
        }

        return Promise.resolve(count);
    }
    deleteUnpopularOneWorlds(containerId: string, popularity: number): Promise<number> {
        let count = 0;
        for (let item of this.db.values()) {
            if (item.containerId !== containerId) {
                continue;
            }
            if (item.countWords === 1 && item.popularity <= popularity) {
                this.db.delete(item.id) && count++;
            }
        }

        return Promise.resolve(count);
    }
    deleteAll(containerId: string): Promise<number> {
        let count = 0;
        for (let item of this.db.values()) {
            if (item.containerId !== containerId) {
                continue;
            }

            this.db.delete(item.id) && count++;
        }

        return Promise.resolve(count);
    }
    deleteIds(ids: string[]): Promise<number> {
        let count = 0;
        for (let id of ids) {
            this.db.delete(id) && count++;
        }

        return Promise.resolve(count);
    }
    incrementPopularity(id: string): Promise<number> {
        const item = this.db.get(id);

        if (!item) {
            return Promise.resolve(0);
        }
        item.popularity++;

        return Promise.resolve(item.popularity);
    }
    async createOrUpdate(concept: Concept): Promise<Concept> {
        concept = { ...concept };
        const id = concept.id;
        let item = this.db.get(id);
        if (!item) {
            item = await this.create(concept);
        } else {
            item.popularity++;
            item.rootNameIds = uniq(item.rootNameIds.concat(concept.rootNameIds));
        }

        return Promise.resolve(item);
    }

    all(): Promise<Concept[]> {
        const array: Concept[] = []
        for (let item of this.db.values()) {
            array.push(item);
        }

        return Promise.resolve(array);
    }
}
