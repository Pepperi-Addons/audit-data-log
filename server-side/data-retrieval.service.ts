import { PapiClient } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';

class DataRetrievalService {

    papiClient: PapiClient

    constructor(private client: Client) {
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonSecretKey: client.AddonSecretKey,
            addonUUID: client.AddonUUID
        });
    }

    // get users data according from users and contacts tables
    async get_users(auditLogs, field) {
        let resultMap = {};
        const chunkedArray: string[][] = [];

        const uuidsList = Array.from(new Set<string>(auditLogs.map(obj => obj[field]))); // creates UUIDs list

        for (let i = 0; i < uuidsList.length; i += 100) {
            chunkedArray.push(uuidsList.slice(i, i + 100));
        }

        for(const subArray of chunkedArray){
            const ret: string[] = [];
            for(const key of subArray){
                ret.push(key);
            }

            await this.get_users_names('users', resultMap, ret);
            await this.get_users_names('contacts', resultMap, ret);
        }
        return resultMap;
    }

    // get addons data from addons table
    async get_addons(auditLogs, field) {
        let resultMap = {};
        const chunkedArray: string[][] = [];

        const uuidsList = Array.from(new Set<string>(auditLogs.map(obj => obj[field]))); // creates UUIDs list

        for (let i = 0; i < uuidsList.length; i += 10) {
            chunkedArray.push(uuidsList.slice(i, i + 10)); // create triplets from the list
        }

        for (const subArray of chunkedArray) {
            const ret: string[] = [];
            for (const addonUUID of subArray) {
                ret.push(`UUID='${addonUUID}'`);
            }
            const whereClause = `where=${ret.join(' OR ')}`;
            const res = await this.get_addons_names(whereClause);
            res.forEach(element => {
                resultMap[element.UUID] = element.Name; // creates the UUID-Name mapping
            });
        }

        return resultMap;
    }

    async get_users_names(table: string, resultMap, UUIDlist: string[]) {

        console.log(`Looking for users names`);
        const getResourceRes = await this.papiClient.post(`/${table}/search`, { UUIDList: UUIDlist, Fields: "UUID,Email,InternalID" })
        getResourceRes.forEach(element => {
            resultMap[element.UUID] = { Email: element.Email, InternalID: element.InternalID }; // creates the UUID-Email mapping
        });
        console.log(`Successfully Got users names`);
    }

    async get_addons_names(queryString: string) {

        console.log(`Looking for addons names, query parameters: ${queryString}`)
        const getResourceRes = await this.papiClient.get(`/addons?${queryString}`);
        console.log(`Successfully Got addons names`);
        return getResourceRes;
    }
}

export default DataRetrievalService;