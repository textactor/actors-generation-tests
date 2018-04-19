
import { RepUpdateData, uniq } from '@textactor/domain';
import * as Loki from 'lokijs';
import { IWikiEntityRepository, Locale, WikiEntity } from '@textactor/concept-domain';
import { formatWikiEntitiesFile } from './data';

export class FileWikiEntityRepository implements IWikiEntityRepository {
    private db: Loki;
    private dbItems: Collection<WikiEntity>;

    constructor(locale: Locale) {
        this.db = new Loki(formatWikiEntitiesFile(locale), { autosave: true, autoload: false });
    }

    init() {
        return new Promise((resolve, reject) => {
            this.db.loadDatabase(null, (error) => {
                if (error) {
                    return reject(error);
                }
                this.dbItems = this.db.getCollection<WikiEntity>('wikientities');
                if (!this.dbItems) {
                    this.dbItems = this.db.addCollection('wikientities', { unique: ['id'] });
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

    getLastnames(lang: string): Promise<string[]> {
        const list: string[] = this.dbItems.where(item => item.lang === lang && !!item.lastname).map(item => item.lastname);

        return Promise.resolve(uniq(list));
    }

    getByPartialNameHash(hash: string): Promise<WikiEntity[]> {
        const list: WikiEntity[] = this.dbItems.where(item => item.partialNamesHashes.indexOf(hash) > -1);

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
    update(data: RepUpdateData<WikiEntity>): Promise<WikiEntity> {
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
}
