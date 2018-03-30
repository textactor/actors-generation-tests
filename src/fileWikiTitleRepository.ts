
import { RepUpdateData } from '@textactor/domain';
import * as Loki from 'lokijs';
import { IWikiTitleRepository, Locale, WikiTitle } from '@textactor/concept-domain';
import { formatWikiTitlesFile } from './data';

export class FileWikiTitleRepository implements IWikiTitleRepository {
    private db: Loki;
    private dbItems: Collection<WikiTitle>;

    constructor(locale: Locale) {
        this.db = new Loki(formatWikiTitlesFile(locale), { autosave: true, autoload: false });
    }

    init() {
        return new Promise((resolve, reject) => {
            this.db.loadDatabase(null, (error) => {
                if (error) {
                    return reject(error);
                }
                this.dbItems = this.db.getCollection<WikiTitle>('titles');
                if (!this.dbItems) {
                    this.dbItems = this.db.addCollection('titles', { unique: ['id'] });
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
    getById(id: string): Promise<WikiTitle> {
        return Promise.resolve(this.dbItems.findOne({ id }))
            .then(item => {
                if (item) {
                    item.createdAt = new Date(item.createdAt);
                    item.lastSearchAt = new Date(item.lastSearchAt);
                }
                return item;
            });
    }
    getByIds(ids: string[]): Promise<WikiTitle[]> {
        const list: WikiTitle[] = this.dbItems.find({ id: { $in: ids } });
        return Promise.resolve(list);
    }
    exists(id: string): Promise<boolean> {
        return Promise.resolve(!!this.dbItems.findOne({ id }));
    }
    delete(id: string): Promise<boolean> {
        return Promise.resolve(!!this.dbItems.remove(this.dbItems.findOne({ id })));
    }
    create(data: WikiTitle): Promise<WikiTitle> {
        if (!!this.dbItems.findOne({ id: data.id })) {
            return Promise.reject(new Error(`Item already exists!`));
        }
        data = Object.assign({ createdAt: new Date() }, data);

        this.dbItems.insertOne(data);

        return Promise.resolve(data);
    }
    update(data: RepUpdateData<WikiTitle>): Promise<WikiTitle> {
        const item = this.dbItems.findOne({ id: data.item.id });
        if (!item) {
            return Promise.resolve(null);
            // return Promise.reject(new Error(`Item not found! id=${data.item.id}`));
        }

        delete data.item.createdAt;

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
    createOrUpdate(data: WikiTitle): Promise<WikiTitle> {
        if (!!this.dbItems.findOne({ id: data.id })) {
            return this.update({ item: data });
        }

        return this.create(data);
    }
}
