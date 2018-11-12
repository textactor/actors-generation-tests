
import * as Loki from 'lokijs';
import { formatWikiTitlesFile } from './data';
import { WikiTitleRepository, WikiTitle } from '@textactor/concept-domain';
import { Locale } from './utils';
import { RepositoryUpdateData } from '../../domain/dest';

export class FileWikiTitleRepository implements WikiTitleRepository {
    deleteStorage(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    createStorage(): Promise<void> {
        throw new Error("Method not implemented.");
    }
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
                    this.dbItems = <Collection<WikiTitle>>this.db.addCollection('titles', { unique: ['id'] });
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
        return Promise.resolve(this.dbItems.findOne({ id }));
    }
    getByIds(ids: string[]): Promise<WikiTitle[]> {
        const list: WikiTitle[] = this.dbItems.find({ id: { $in: ids } });
        return Promise.resolve(list);
    }
    exists(id: string): Promise<boolean> {
        return Promise.resolve(!!this.dbItems.findOne({ id }));
    }
    delete(id: string): Promise<boolean> {
        const it = this.dbItems.findOne({ id });
        if (!it) {
            return Promise.resolve(false);
        }
        return Promise.resolve(!!this.dbItems.remove(it));
    }
    create(data: WikiTitle): Promise<WikiTitle> {
        if (!!this.dbItems.findOne({ id: data.id })) {
            return Promise.reject(new Error(`Item already exists!`));
        }
        data = Object.assign({ createdAt: new Date() }, data);

        this.dbItems.insertOne(data);

        return Promise.resolve(data);
    }
    update(data: RepositoryUpdateData<WikiTitle>): Promise<WikiTitle> {
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
    createOrUpdate(data: WikiTitle): Promise<WikiTitle> {
        if (!!this.dbItems.findOne({ id: data.id })) {
            return this.update({ id: data.id, set: data });
        }

        return this.create(data);
    }
}
