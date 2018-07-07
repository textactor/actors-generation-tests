
import * as Loki from 'lokijs';
import { formatWikiSearchNamesFile } from './data';
import { IWikiSearchNameRepository, WikiSearchName, RepUpdateData } from 'textactor-explorer';
import { Locale } from './utils';

export class FileWikiSearchNameRepository implements IWikiSearchNameRepository {
    private db: Loki;
    private dbItems: Collection<WikiSearchName>;

    constructor(locale: Locale) {
        this.db = new Loki(formatWikiSearchNamesFile(locale), { autosave: true, autoload: false });
    }

    init() {
        return new Promise((resolve, reject) => {
            this.db.loadDatabase(null, (error) => {
                if (error) {
                    return reject(error);
                }
                this.dbItems = this.db.getCollection<WikiSearchName>('names');
                if (!this.dbItems) {
                    this.dbItems = <Collection<WikiSearchName>>this.db.addCollection('names', { unique: ['id'] });
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
    getById(id: string): Promise<WikiSearchName> {
        return Promise.resolve(this.dbItems.findOne({ id }));
    }
    getByIds(ids: string[]): Promise<WikiSearchName[]> {
        const list: WikiSearchName[] = this.dbItems.find({ id: { $in: ids } });
        return Promise.resolve(list);
    }
    exists(id: string): Promise<boolean> {
        return Promise.resolve(!!this.dbItems.findOne({ id }));
    }
    delete(id: string): Promise<boolean> {
        return Promise.resolve(!!this.dbItems.remove(this.dbItems.findOne({ id })));
    }
    create(data: WikiSearchName): Promise<WikiSearchName> {
        if (!!this.dbItems.findOne({ id: data.id })) {
            return Promise.reject(new Error(`Item already exists!`));
        }
        data = Object.assign({ createdAt: new Date(), lastSearchAt: new Date() }, data);

        this.dbItems.insertOne(data);

        return Promise.resolve(data);
    }
    update(data: RepUpdateData<string, WikiSearchName>): Promise<WikiSearchName> {
        const item = this.dbItems.findOne({ id: data.id });
        if (!item) {
            return Promise.resolve(null);
            // return Promise.reject(new Error(`Item not found! id=${data.item.id}`));
        }

        if (data.set) {
            delete data.set.createdAt;

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
    createOrUpdate(data: WikiSearchName): Promise<WikiSearchName> {
        if (!!this.dbItems.findOne({ id: data.id })) {
            return this.update({ id: data.id, set: data });
        }

        return this.create(data);
    }
}
