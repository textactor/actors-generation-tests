
import { RepUpdateData } from '@textactor/domain';
import { IConceptRepository, Concept, Locale, PopularConceptHash } from '@textactor/concept-domain';
import { formatConceptsFile } from './data';
import * as Loki from 'lokijs';

export class FileConceptRepository implements IConceptRepository {
    private db: Loki;
    private dbItems: Loki.Collection<Concept>;

    constructor(locale: Locale) {
        this.db = new Loki(formatConceptsFile(locale), { autosave: true, autoload: false });
        this.dbItems = this.db.addCollection('concepts', { unique: ['id'] });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((error) => {
                if (error) {
                    return reject(error);
                }
                resolve();
            })
        })
    }

    count(_locale: Locale): Promise<number> {
        const count = this.dbItems.count();

        return Promise.resolve(count);
    }

    getAbbrConceptsWithContextName(): Promise<Concept[]> {
        const list: Concept[] = this.dbItems.where(concept => !!concept.isAbbr && !!concept.contextNames);

        return Promise.resolve(list);
    }

    getConceptsWithAbbr(): Promise<Concept[]> {
        const list: Concept[] = this.dbItems.where(concept => !concept.isAbbr && !!concept.abbr);

        return Promise.resolve(list);
    }

    deleteByNameHash(hashes: string[]): Promise<number> {
        const list: Concept[] = this.dbItems.find({ nameHash: { $in: hashes } });

        for (let item of list) {
            this.dbItems.remove(item);
        }

        return Promise.resolve(list.length);
    }

    deleteByRootNameHash(hashes: string[]): Promise<number> {
        const list: Concept[] = this.dbItems.find({ rootNameHash: { $in: hashes } });

        for (let item of list) {
            this.dbItems.remove(item);
        }

        return Promise.resolve(list.length);
    }

    list(_locale: Locale, limit: number, skip?: number): Promise<Concept[]> {
        skip = skip || 0;
        const list: Concept[] = this.dbItems.find().slice(skip, limit);

        return Promise.resolve(list.slice(skip, skip + limit));
    }

    getById(id: string): Promise<Concept> {
        return Promise.resolve(this.dbItems.findOne({ id }));
    }
    getByIds(ids: string[]): Promise<Concept[]> {
        return Promise.resolve(this.dbItems.find({ id: { $in: ids } }));
    }
    exists(id: string): Promise<boolean> {
        return Promise.resolve(!!this.dbItems.findOne({ id }));
    }
    delete(id: string): Promise<boolean> {
        return Promise.resolve(!!this.dbItems.remove(this.dbItems.findOne({ id })));
    }
    create(data: Concept): Promise<Concept> {
        if (!!this.dbItems.findOne({ id: data.id })) {
            return Promise.reject(new Error(`Item already exists!`));
        }
        data = Object.assign({ popularity: 1, createdAt: new Date() }, data);

        this.dbItems.insertOne(data);

        return Promise.resolve(data);
    }
    update(data: RepUpdateData<Concept>): Promise<Concept> {
        const item = this.dbItems.findOne({ id: data.item.id });
        if (!item) {
            return Promise.resolve(null);
            // return Promise.reject(new Error(`Item not found! id=${data.item.id}`));
        }

        for (let prop in data.item) {
            if ([null, undefined].indexOf((<any>data.item)[prop]) < 0) {
                (<any>item)[prop] = (<any>data.item)[prop];
            }
        }

        if (data.delete) {
            for (let prop of data.delete) {
                delete (<any>item)[prop];
            }
        }

        this.dbItems.update(item);

        return Promise.resolve(item);
    }

    getByNameHash(hash: string): Promise<Concept[]> {
        const list = this.dbItems.find({ nameHash: hash });

        return Promise.resolve(list);
    }
    getByRootNameHash(hash: string): Promise<Concept[]> {
        const list = this.dbItems.find({ rootNameHash: hash });

        return Promise.resolve(list);
    }
    getPopularRootNameHashes(_locale: Locale, limit: number, skip: number, minCountWords?: number): Promise<PopularConceptHash[]> {
        minCountWords = minCountWords || 1;
        const map: { [hash: string]: { popularity: number, ids: string[] } } = {}

        for (let item of this.dbItems.find()) {
            if (item.countWords < minCountWords) {
                continue;
            }
            map[item.rootNameHash] = map[item.rootNameHash] || { popularity: 0, ids: [] };

            map[item.rootNameHash].popularity += item.popularity;
            map[item.rootNameHash].ids.push(item.id);
        }

        const list = Object.keys(map)
            .map(hash => ({ hash, ...map[hash] }))
            .sort((a, b) => b.popularity - a.popularity)
            .slice(skip, skip + limit);

        return Promise.resolve(list);
    }
    deleteUnpopular(_locale: Locale, popularity: number): Promise<number> {
        let count = 0;
        for (let item of this.dbItems.find()) {
            if (item.popularity <= popularity) {
                this.dbItems.remove(item) && count++;
            }
        }

        return Promise.resolve(count);
    }
    deleteUnpopularAbbreviations(_locale: Locale, popularity: number): Promise<number> {
        let count = 0;
        for (let item of this.dbItems.find({ isAbbr: true })) {
            if (item.popularity <= popularity) {
                this.dbItems.remove(item) && count++;
            }
        }

        return Promise.resolve(count);
    }
    deleteUnpopularOneWorlds(_locale: Locale, popularity: number): Promise<number> {
        let count = 0;
        for (let item of this.dbItems.find({ isAbbr: false, countWords: 1 })) {
            if (item.popularity <= popularity) {
                this.dbItems.remove(item) && count++;
            }
        }

        return Promise.resolve(count);
    }
    deleteAll(_locale: Locale): Promise<number> {
        let count = this.dbItems.count();
        this.dbItems.clear({ removeIndices: true });

        return Promise.resolve(count);
    }
    deleteIds(ids: string[]): Promise<number> {
        this.dbItems.removeWhere({ id: { $in: ids } });

        return Promise.resolve(ids.length);
    }
    incrementPopularity(id: string): Promise<number> {
        const item = this.dbItems.findOne({ id });

        if (!item) {
            return Promise.resolve(null);
        }
        item.popularity++;
        this.dbItems.update(item);

        return Promise.resolve(item.popularity);
    }
    async createOrUpdate(concept: Concept): Promise<Concept> {
        concept = { ...concept };
        const id = concept.id;
        let item = this.dbItems.findOne({ id }) as Concept;
        if (!item) {
            await this.create(concept);
        } else {
            concept.popularity = item.popularity + 1;
            item = await this.update({ item: concept });
        }

        return Promise.resolve(item);
    }

    all(): Promise<Concept[]> {
        return Promise.resolve(this.dbItems.find());
    }
}
