import { Locale } from "./utils";
import { IConceptRepository, ConceptActor, WikiEntityType, ProcessConcepts, ProcessConceptsOptions, IConceptRootNameRepository } from "@textactor/concept-domain";
import { MemoryActorRepository, SaveActor, MemoryActorNameRepository, Actor, ActorHelper, ActorType, CreatingActorData } from '@textactor/actor-domain';
import { formatActorsFile, formatConceptActorsFile } from "./data";
import { writeFileSync } from "fs";
import { FileWikiEntityRepository } from "./fileWikiEntityRepository";
import { FileWikiSearchNameRepository } from "./fileWikiSearchNameRepository";
import { FileWikiTitleRepository } from "./fileWikiTitleRepository";

export async function generateActors(locale: Locale, conceptRepository: IConceptRepository, rootNameRep: IConceptRootNameRepository): Promise<void> {
    const wikiRepository = new FileWikiEntityRepository(locale);
    const actorRepository = new MemoryActorRepository();
    const actorNameRepository = new MemoryActorNameRepository();
    const wikiSearchNameRepository = new FileWikiSearchNameRepository(locale);
    const wikiTitleRepository = new FileWikiTitleRepository(locale);
    const saveActor = new SaveActor(actorRepository, actorNameRepository);
    const processConcepts = new ProcessConcepts(locale,
        conceptRepository,
        rootNameRep,
        wikiRepository,
        wikiSearchNameRepository,
        wikiTitleRepository);

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
        const actor = conceptActorToActor(conceptActor);
        return saveActor.execute(actor).then(() => { })
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
