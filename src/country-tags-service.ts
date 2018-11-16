import { CountryTagsService } from "@textactor/actors-explorer";

export class LocaleCountryTagsService implements CountryTagsService {
    getTags(country: string, lang: string): string[] {
        if (LOCALE_COUNTRY_TAGS[country]) {
            return LOCALE_COUNTRY_TAGS[country][lang];
        }
        return [];
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
