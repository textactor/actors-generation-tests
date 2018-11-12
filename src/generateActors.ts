
import { Locale } from "./utils";
import {
    MemoryActorRepository,
    SaveActor,
    MemoryActorNameRepository,
    ActorType,
    ActorNameType,
    BuildActorParams,
} from '@textactor/actor-domain';
import { formatActorsFile, formatConceptActorsFile, formatActorNamesFile } from "./data";
import { writeFileSync } from "fs";
import { WikiEntityType } from "@textactor/concept-domain";
import { uniqByProperty, NameHelper } from "@textactor/domain";
import {ExplorerApi, DataCollector, Actor as ConceptActor} from '@textactor/actors-explorer';

export async function generateActors(explorerApi: ExplorerApi, dataContainer: DataCollector): Promise<void> {
    const container = dataContainer.container();

    const locale: Locale = { lang: container.lang, country: container.country };
    const actorRepository = new MemoryActorRepository();
    const actorNameRepository = new MemoryActorNameRepository();
    const saveActor = new SaveActor(actorRepository, actorNameRepository);

    const conceptActors: ConceptActor[] = [];

    const explorer = explorerApi.createContainerExplorer(container.id, {
        minConceptPopularity: 1,
        minAbbrConceptPopularity: 6,
        minOneWordConceptPopularity: 5,
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
    const actorNames = await actorNameRepository.all();

    writeFileSync(formatActorsFile(locale), JSON.stringify(actors), 'utf8');
    writeFileSync(formatConceptActorsFile(locale), JSON.stringify(conceptActors), 'utf8');
    writeFileSync(formatActorNamesFile(locale), JSON.stringify(actorNames), 'utf8');
}

function isValidActor(conceptActor: ConceptActor) {
    if (!conceptActor || !conceptActor.wikiEntity) {
        return false;
    }

    const nameCountWords = Math.min(NameHelper.countWords(conceptActor.wikiEntity.name), NameHelper.countWords(conceptActor.name));

    if (nameCountWords < 2) {
        if (!conceptActor.wikiEntity.type) {
            console.log(`actor no type and too short: ${conceptActor.wikiEntity.name}`);
            return false;
        }
        const isLocale = conceptActor.wikiEntity.countryCodes.includes(conceptActor.country);
        const countLinks = Object.keys(conceptActor.wikiEntity.links).length;

        if (!isLocale && countLinks < 10) {
            console.log(`actor too short name & not popular: ${conceptActor.name}`);
            return false;
        }
    }
    return true;
}

function conceptActorToActor(conceptActor: ConceptActor) {
    const actorData: BuildActorParams = {
        name: conceptActor.name,
        names: conceptActor.names.map(item => ({ name: item.name, popularity: item.popularity, type: item.type as ActorNameType })),
        country: conceptActor.country,
        lang: conceptActor.lang,
        type: conceptActor.wikiEntity && conceptWikiTypeToActorType(conceptActor.wikiEntity.type),
        wikiEntity: {
            wikiDataId: conceptActor.wikiEntity.wikiDataId,
            description: conceptActor.wikiEntity.description,
            name: conceptActor.wikiEntity.name,
            wikiPageTitle: conceptActor.wikiEntity.wikiPageTitle,
            countLinks: Object.keys(conceptActor.wikiEntity.links).length,
            countryCodes: conceptActor.wikiEntity.countryCodes,
        }
    };

    if (conceptActor.abbr) {
        actorData.abbr = conceptActor.abbr;
    }
    if (conceptActor.commonName) {
        actorData.commonName = conceptActor.commonName;
    }

    actorData.names = uniqByProperty(actorData.names, 'name');

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
