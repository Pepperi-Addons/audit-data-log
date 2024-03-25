import { PapiClient } from '@pepperi-addons/papi-sdk'
import { Client } from '@pepperi-addons/debug-server';
import config from '../addon.config.json';

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
        const uuidsList = Array.from(new Set<string>(auditLogs.map(obj => obj[field]))); // creates UUIDs list

        for (let i = 0; i < uuidsList.length; i += 500) {
            await Promise.all(['users', 'contacts'].map(table => this.get_users_names(table, resultMap, uuidsList.slice(i, i + 500))));
        }
        return resultMap;
    }

    // get addons data from addons table
    async get_addons(auditLogs, field) {
        let resultMap = {};
        const uuidsList = Array.from(new Set<string>(auditLogs.map(obj => `UUID='${obj[field]}'`))); // creates UUIDs list

        for (let i = 0; i < uuidsList.length; i += 100) {
            const whereClause = `where=${uuidsList.slice(i, i + 100).join(' OR ')}`;
            const res = await this.get_addons_names(whereClause);

            res.forEach(element => {
                resultMap[element.UUID] = element.Name; // creates the UUID-Name mapping
            });
        }

        return resultMap;
    }

    async get_users_names(table: string, resultMap, UUIDlist: string[]) {
        try{
            console.log(`Looking for users names: ${UUIDlist.join(', ')}`);
            const getResourceRes = await this.papiClient.post(`/${table}/search`, { UUIDList: UUIDlist, Fields: "UUID,Email,InternalID" })
            getResourceRes.forEach(element => {
                resultMap[element.UUID] = { Email: element.Email, InternalID: element.InternalID }; // creates the UUID-Email mapping
            });
            console.log(`Successfully Got users names: ${UUIDlist.join(', ')}`);
        } catch (error) {
            console.error(`Error: ${error}`);
        }

    }

    async get_addons_names(queryString: string) {

        console.log(`Looking for addons names, query parameters: ${queryString}`)
        const getResourceRes = await this.papiClient.get(`/addons?${queryString}`);
        console.log(`Successfully Got addons names`);
        return getResourceRes;
    } catch (error) {
        console.error(`Error: ${error}`);
    }

    async validateHeaders(secretKey: string) {    
        const papiClient = new PapiClient({
            baseURL: this.client.BaseURL,
            token: this.client.OAuthAccessToken,
            addonUUID: this.client.AddonUUID,
            actionUUID: this.client.ActionUUID,
            addonSecretKey: secretKey
        });
    
        await papiClient.get(`/var/sk/addons/${config.AddonUUID}/validate`); // throws error if invalid
    }
}

export default DataRetrievalService;