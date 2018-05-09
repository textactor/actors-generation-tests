import { Locale } from "./utils";
import { IConceptRepository, ConceptActor, WikiEntityType, ProcessConcepts, ProcessConceptsOptions, IConceptRootNameRepository, ConceptContainer, IConceptContainerRepository } from "@textactor/concept-domain";
import { MemoryActorRepository, SaveActor, MemoryActorNameRepository, ActorType, KnownActorData } from '@textactor/actor-domain';
import { formatActorsFile, formatConceptActorsFile } from "./data";
import { writeFileSync } from "fs";
import { FileWikiEntityRepository } from "./fileWikiEntityRepository";
import { FileWikiSearchNameRepository } from "./fileWikiSearchNameRepository";
import { FileWikiTitleRepository } from "./fileWikiTitleRepository";
import { NameHelper } from "@textactor/domain";
import { CountryTagsService } from "./countryTagsService";

export async function generateActors(container: ConceptContainer, containerRep: IConceptContainerRepository,conceptRepository: IConceptRepository, rootNameRep: IConceptRootNameRepository): Promise<void> {
    const locale: Locale = { lang: container.lang, country: container.country };
    const wikiRepository = new FileWikiEntityRepository(locale);
    const actorRepository = new MemoryActorRepository();
    const actorNameRepository = new MemoryActorNameRepository();
    const wikiSearchNameRepository = new FileWikiSearchNameRepository(locale);
    const wikiTitleRepository = new FileWikiTitleRepository(locale);
    const saveActor = new SaveActor(actorRepository, actorNameRepository);
    const processConcepts = new ProcessConcepts(container,
        containerRep,
        conceptRepository,
        rootNameRep,
        wikiRepository,
        wikiSearchNameRepository,
        wikiTitleRepository,
        new CountryTagsService());

    const conceptActors: ConceptActor[] = [];

    const processOptions: ProcessConceptsOptions = {
        minConceptPopularity: 2,
        minAbbrConceptPopularity: 4,
        minOneWordConceptPopularity: 4,
        minRootConceptPopularity: 5,
        minRootAbbrConceptPopularity: 12,
        minRootOneWordConceptPopularity: 12,
    };

    await wikiRepository.init();
    await wikiSearchNameRepository.init();
    await wikiTitleRepository.init();

    await processConcepts.execute((conceptActor: ConceptActor) => {
        conceptActors.push(conceptActor);
        if (isValidActor(conceptActor)) {
            const actor = conceptActorToActor(conceptActor);
            return saveActor.execute(actor).then(() => { })
        }
    }, processOptions)
        .then(() => actorRepository.all())
        .then(actors => {
            writeFileSync(formatActorsFile(locale), JSON.stringify(actors), 'utf8');
            writeFileSync(formatConceptActorsFile(locale), JSON.stringify(conceptActors), 'utf8');
        });

    await wikiRepository.close();
    await wikiSearchNameRepository.close();
    await wikiTitleRepository.close();
}

function isValidActor(conceptActor: ConceptActor) {
    if (!conceptActor || !conceptActor.wikiEntity) {
        return false;
    }

    if (!conceptActor.wikiEntity.type) {
        if (NameHelper.countWords(conceptActor.wikiEntity.name) < 2) {
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
