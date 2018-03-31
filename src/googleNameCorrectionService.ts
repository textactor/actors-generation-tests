
import fetch from 'node-fetch';
import { INameCorrectionService, WikiEntityHelper } from '@textactor/concept-domain';
import { stringify } from 'querystring';

export class GoogleNameCorrectionService implements INameCorrectionService {
    correct(name: string, lang: string): Promise<string> {
        const qs = {
            query: name,
            languages: lang,
            limit: 1,
            key: process.env.GOOGLE_API_KEY,
        };

        const url = `https://kgsearch.googleapis.com/v1/entities:search?${stringify(qs)}`;

        return fetch(url)
            .then(response => response.json())
            .then<string>((data: any) => {
                if (data.error) {
                    return Promise.reject(new Error(`Data error: ${data.error}`));
                }
                const list: any[] = data.itemListElement;
                if (!list || !list.length) {
                    return null;
                }
                const item = list[0].result;
                if (!item || !item.detailedDescription) {
                    return null;
                }
                if (item.resultScore < 500) {
                    console.log(`GOOGLE resultScore<500: ${name}`)
                    return null;
                }
                const wikiUrl = item.detailedDescription.url;
                if (!wikiUrl) {
                    return null;
                }

                const exResult = /\.wikipedia\.org\/wiki\/(.+)$/.exec(wikiUrl);
                if (!exResult) {
                    return null;
                }

                const title = decodeURIComponent(exResult[1]).trim().replace(/_+/g, ' ');

                const splittedName = WikiEntityHelper.splitName(title);

                if (splittedName && splittedName.simple) {
                    return splittedName.simple;
                }

                return title;
            })
            .catch(e => {
                console.log(e);
                return null;
            })
    }
}
