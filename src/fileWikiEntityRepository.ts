
import * as Loki from 'lokijs';
import { formatWikiEntitiesFile } from './data';
import { WikiEntity, IWikiEntityRepository, RepUpdateData } from 'textactor-explorer';
import { Locale } from './utils';

export class FileWikiEntityRepository implements IWikiEntityRepository {

    private db: Loki;
    private dbItems: Collection<WikiEntity>;

    constructor(locale: Locale) {
        this.db = new Loki(formatWikiEntitiesFile(locale), { autosave: true, autoload: false });
    }

    getInvalidPartialNames(_lang: string): Promise<string[]> {
        return Promise.resolve([]);
    }
    createOrUpdate(data: WikiEntity): Promise<WikiEntity> {
        if (this.dbItems.findOne({ id: data.id })) {
            return this.update({ id: data.id, set: data });
        }
        return this.create(data);
    }

    init() {
        return new Promise((resolve, reject) => {
            this.db.loadDatabase(null, (error) => {
                if (error) {
                    return reject(error);
                }
                this.dbItems = this.db.getCollection<WikiEntity>('wikientities');
                if (!this.dbItems) {
                    this.dbItems = <Collection<WikiEntity>>this.db.addCollection('wikientities', { unique: ['id'] });
                }

                resolve();
            })
        })
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

    count(): Promise<number> {
        return Promise.resolve(this.dbItems.count());
    }

    getByPartialNameHash(hash: string): Promise<WikiEntity[]> {
        const list: WikiEntity[] = this.dbItems.where(item => item.partialNamesHashes && item.partialNamesHashes.indexOf(hash) > -1);

        return Promise.resolve(list);
    }

    getByNameHash(hash: string): Promise<WikiEntity[]> {
        const list: WikiEntity[] = this.dbItems.where(item => item.namesHashes.indexOf(hash) > -1);

        return Promise.resolve(list);
    }
    getById(id: string): Promise<WikiEntity> {
        return Promise.resolve(this.dbItems.findOne({ id }));
    }
    getByIds(ids: string[]): Promise<WikiEntity[]> {
        const list: WikiEntity[] = this.dbItems.find({ id: { $in: ids } });
        return Promise.resolve(list);
    }
    exists(id: string): Promise<boolean> {
        return Promise.resolve(!!this.dbItems.findOne({ id }));
    }
    delete(id: string): Promise<boolean> {
        return Promise.resolve(!!this.dbItems.remove(this.dbItems.findOne({ id })));
    }
    create(data: WikiEntity): Promise<WikiEntity> {
        if (!!this.dbItems.findOne({ id: data.id })) {
            return Promise.reject(new Error(`Item already exists!`));
        }
        data = Object.assign({ createdAt: new Date() }, data);

        this.dbItems.insertOne(data);

        return Promise.resolve(data);
    }
    update(data: RepUpdateData<string, WikiEntity>): Promise<WikiEntity> {
        const item = this.dbItems.findOne({ id: data.id });
        if (!item) {
            return Promise.resolve(null);
        }

        if (data.set) {
            for (let prop in data.set) {
                if ([null, undefined].indexOf((<any>data.set)[prop]) < 0) {
                    (<any>item)[prop] = (<any>data.set)[prop];
                }
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
}
