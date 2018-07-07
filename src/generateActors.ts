
import { Locale } from "./utils";
import { MemoryActorRepository, SaveActor, MemoryActorNameRepository, ActorType, KnownActorData } from '@textactor/actor-domain';
import { formatActorsFile, formatConceptActorsFile } from "./data";
import { writeFileSync } from "fs";
import { IExplorerApi, INewDataContainer, Actor as ConceptActor, WikiEntityType } from "textactor-explorer";

export async function generateActors(explorerApi: IExplorerApi, dataContainer: INewDataContainer): Promise<void> {
    const container = dataContainer.container();

    const locale: Locale = { lang: container.lang, country: container.country };
    const actorRepository = new MemoryActorRepository();
    const actorNameRepository = new MemoryActorNameRepository();
    const saveActor = new SaveActor(actorRepository, actorNameRepository);

    const conceptActors: ConceptActor[] = [];

    const explorer = explorerApi.newExplorer(container.id, {
        minConceptPopularity: 1,
        minAbbrConceptPopularity: 6,
        minOneWordConceptPopularity: 6,
        minRootConceptPopularity: 2,
        minRootAbbrConceptPopularity: 6,
        minRootOneWordConceptPopularity: 6,
    })

    explorer.onData(async (conceptActor: ConceptActor) => {
        conceptActors.push(conceptActor);
        if (isValidActor(conceptActor)) {
            const actor = conceptActorToActor(conceptActor);
            await saveActor.execute(actor);
        }
    });

    explorer.onError(error => console.error(error));

    await new Promise(resolve => {
        explorer.onEnd(resolve);
        explorer.start();
    });

    const actors = await actorRepository.all();

    writeFileSync(formatActorsFile(locale), JSON.stringify(actors), 'utf8');
    writeFileSync(formatConceptActorsFile(locale), JSON.stringify(conceptActors), 'utf8');
}

function isValidActor(conceptActor: ConceptActor) {
    if (!conceptActor || !conceptActor.wikiEntity) {
        return false;
    }

    if (!conceptActor.wikiEntity.type) {
        if (conceptActor.wikiEntity.name.split(/\s+/g).length < 2) {
            // debug(`actor no type and too short: ${conceptActor.wikiEntity.name}`);
            return false;
        }
    }

    const lowerCaseNames = conceptActor.wikiEntity.names.filter(name => name.toLowerCase() === name);

    if (lowerCaseNames.length > conceptActor.wikiEntity.names.length / 3) {
        // debug(`too many lowecase names: ${lowerCaseNames}`);
        return false;
    }
    return true;
}

function conceptActorToActor(conceptActor: ConceptActor) {
    const actorData: KnownActorData = {
        name: conceptActor.name,
        names: conceptActor.names.map(name => ({ name })),
        country: conceptActor.country,
        lang: conceptActor.lang,
        type: conceptActor.wikiEntity && conceptWikiTypeToActorType(conceptActor.wikiEntity.type),
    };

    if (conceptActor.wikiEntity) {
        actorData.wikiEntity = {
            wikiDataId: conceptActor.wikiEntity.wikiDataId,
            description: conceptActor.wikiEntity.description,
            name: conceptActor.wikiEntity.name,
            wikiPageTitle: conceptActor.wikiEntity.wikiPageTitle,
            // countryCode: conceptActor.wikiEntity.countryCode,
        };
    }

    return actorData;
}

function conceptWikiTypeToActorType(wikiType: WikiEntityType): ActorType {
    switch (wikiType) {
        case WikiEntityType.EVENT: return ActorType.EVENT;
        case WikiEntityType.ORG: return ActorType.ORG;
        case WikiEntityType.PERSON: return ActorType.PERSON;
        case WikiEntityType.PLACE: return ActorType.PLACE;
        case WikiEntityType.PRODUCT: return ActorType.PRODUCT;
        case WikiEntityType.WORK: return ActorType.WORK;
    }
}
