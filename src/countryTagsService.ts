import { ICountryTagsService } from "@textactor/concept-domain";

export class CountryTagsService implements ICountryTagsService {
    getTags(country: string, lang: string): string[] {
        if (LOCALE_COUNTRY_TAGS[country]) {
            return LOCALE_COUNTRY_TAGS[country][lang];
        }
    }
}

const LOCALE_COUNTRY_TAGS: { [country: string]: { [lang: string]: string[] } } = {
    md: {
        ro: ['republica moldova', 'moldova'],
    },
    ro: {
        ro: ['românia', 'româniei'],
    },
    ru: {
        ru: ['Россия', 'РФ', 'России', 'Российской'],
    },
}
