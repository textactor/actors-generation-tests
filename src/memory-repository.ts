
import { RepositoryUpdateData, BaseEntity, Repository } from '@textactor/domain';


export class MemoryRepository<T extends BaseEntity> implements Repository<T> {

    protected db: Map<string, T> = new Map()
    async deleteStorage() {
        this.db.clear()
    }
    async createStorage() {

    }

    createOrUpdate(data: T): Promise<T> {
        const item = this.db.get(data.id);
        if (item) {
            return this.update({ id: data.id, set: data });
        }
        return this.create(data);
    }

    getById(id: string): Promise<T | null> {
        return Promise.resolve(this.db.get(id) || null);
    }
    getByIds(ids: string[]): Promise<T[]> {
        const list: T[] = [];
        for (let id of ids) {
            const item = this.db.get(id);
            if (item) {
                list.push(item);
            }
        }
        return Promise.resolve(list);
    }
    exists(id: string): Promise<boolean> {
        return Promise.resolve(!!this.db.get(id));
    }
    delete(id: string): Promise<boolean> {
        return Promise.resolve(this.db.delete(id));
    }
    async create(data: T): Promise<T> {
        if (!!this.db.get(data.id)) {
            return Promise.reject(new Error(`Item already exists!`));
        }
        const entity = await this.getById(data.id);
        if (!entity) {
            throw new Error(`Entity not found!`)
        }
        return entity;
    }
    update(data: RepositoryUpdateData<T>): Promise<T> {

        const item = this.db.get(data.id);
        if (!item) {
            return Promise.reject(new Error(`Item not found! id=${data.id}`));
        }

        if (data.set) {
            delete (<any>data.set).createdAt;

            for (let prop in data.set) {
                (<any>item)[prop] = (<any>data.set)[prop]
            }
        }

        if (data.delete) {
            for (let prop of data.delete) {
                delete (<any>item)[prop];
            }
        }

        return Promise.resolve(item);
    }
}
