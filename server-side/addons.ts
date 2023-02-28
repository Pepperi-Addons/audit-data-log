import { Client } from "@pepperi-addons/debug-server/dist";
import { PapiClient } from "@pepperi-addons/papi-sdk";

export class Addons{
    papiClient: PapiClient;
    addonNameMap = new Map<string, string>(); // for mapping addon uuid to addon name

    constructor(client: Client){
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonUUID: client.AddonUUID,
            addonSecretKey: client.AddonSecretKey,
            actionUUID: client.ActionUUID
        });
    }

    // get all addons, for each addonUUID upsert its correspnding addonName
    async createUUIDNameMapping(UUIDList: string[]){
        this.initiateAddonNameMap(UUIDList)
        await this.getAddons(); // upsert to the map addonName for each addonUUID in the request
    }

    // initiate empty map entry for each addonUUID
    initiateAddonNameMap(UUIDList: string[]){
        UUIDList.forEach(addonUUID => {
            this.addonNameMap.set(addonUUID, "");
        })
    }

    // call addons table with all UUIDs to get a map for addon uuid - addon name
    async getAddons() {
        try{
            console.log("About to iterate over addons table to get list of addonUUIDs-addonNames.");
            await this.papiClient.addons.iter({
                page_size: -1,
                fields: ['UUID', 'Name']
                }).toArray().then( (addons) => {
                    addons.forEach(addon => {
                        if(this.addonNameMap.has(addon['UUID']!)){ // create a new map entry
                            this.addonNameMap.set(addon['UUID']!, addon['Name']!);
                        }
                    })
                });
            console.log("addons table data retrieved successfully.");

        } catch(err){
            console.log(`Could not get addons data, error: ${err}`);
        }
        
    }    
}