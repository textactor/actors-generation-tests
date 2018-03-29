import { Locale } from "./utils";
import { IConceptRepository, ConceptActor, WikiEntityType, ProcessConcepts, ProcessConceptsOptions } from "@textactor/concept-domain";
import { MemoryActorRepository, SaveActor, MemoryActorNameRepository, Actor, ActorHelper, ActorType, CreatingActorData } from '@textactor/actor-domain';
import { formatActorsFile, formatConceptActorsFile } from "./data";
import { writeFileSync } from "fs";
import { FileWikiEntityRepository } from "./fileWikiEntityRepository";

export async function generateActors(locale: Locale, conceptRepository: IConceptRepository): Promise<void> {
    const wikiRepository = new FileWikiEntityRepository(locale);
    const actorRepository = new MemoryActorRepository();
    const actorNameRepository = new MemoryActorNameRepository();
    const saveActor = new SaveActor(actorRepository, actorNameRepository);
    const processConcepts = new ProcessConcepts(locale, conceptRepository, wikiRepository);

    const conceptActors: ConceptActor[] = [];

    const processOptions: ProcessConceptsOptions = {
        minConceptPopularity: 10,
        minAbbrConceptPopularity: 15,
        minOneWordConceptPopularity: 15,
    };

    await wikiRepository.init();

    await processConcepts.execute((conceptActor: ConceptActor) => {
        conceptActors.push(conceptActor);
        const actor = conceptActorToActor(conceptActor);
        return saveActor.execute(actor).then(() => { })
    }, processOptions)
        .then(() => actorRepository.all())
        .then(actors => {
            writeFileSync(formatActorsFile(locale), JSON.stringify(actors), 'utf8');
            writeFileSync(formatConceptActorsFile(locale), JSON.stringify(conceptActors), 'utf8');
        });

    await wikiRepository.close();
}

function conceptActorToActor(conceptActor: ConceptActor): Actor {
    const actorData: CreatingActorData = {
        abbr: conceptActor.abbr,
        name: conceptActor.name,
        names: conceptActor.names,
        type: conceptActor.wikiEntity && wikiTypeToActorType(conceptActor.wikiEntity.type),
        country: conceptActor.country,
        lang: conceptActor.lang,
        wikiDataId: conceptActor.wikiEntity && conceptActor.wikiEntity.wikiDataId,
    };

    return ActorHelper.create(actorData);
}

function wikiTypeToActorType(wikiType: WikiEntityType): ActorType {
    switch (wikiType) {
        case WikiEntityType.EVENT: return ActorType.EVENT;
        case WikiEntityType.ORG: return ActorType.ORG;
        case WikiEntityType.PERSON: return ActorType.PERSON;
        case WikiEntityType.PLACE: return ActorType.PLACE;
        case WikiEntityType.PRODUCT: return ActorType.PRODUCT;
    }
}
