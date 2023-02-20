import { Client } from '@pepperi-addons/debug-server/dist';
import { PapiClient } from '@pepperi-addons/papi-sdk';
import { callElasticSearchLambda } from '@pepperi-addons/system-addon-utils';
import jwtDecode from "jwt-decode";

const auditType= "sync_action";
const indexName = 'audit_log';

export type addonType = {
    UUID: string,
    Name: string
};

export type addonNameDurationObject = {
    Duration: number,
    AddonUUID: string,
    FunctionName: string
};

export type relationResultType = {
    Data: string,
    Description: string,
    Size: number
};

export class ComputingTime{
    papiClient: PapiClient;
    relationResultObject: relationResultType[] = []; // the data sent to the relation
    addonNameMap = new Map<string, string>(); // for mapping addon uuid to addon name
    distributorUUID: string;

    constructor(private client: Client) {
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonUUID: client.AddonUUID,
            addonSecretKey: client.AddonSecretKey,
            actionUUID: client.ActionUUID
        });

        this.distributorUUID = (<any>jwtDecode(client.OAuthAccessToken))["pepperi.distributoruuid"];
    }
    
    async getComputingTime(){ 
        let functionDurationMap = new Map<string, addonNameDurationObject>(); // for mapping function to its duration; key- functionName_AddonUUID, value- function duration, addonUUID, functionName  
        try{
            let res = await this.getComputedTimeDataFromElastic();
            if(res.success){
                res.resultObject.hits.hits.forEach(element => { //for each element returned from elastic-
                    // extract functionName addonUUID and function duration and insert to the dictionary according to functionName_addonUUID
                    const functionName = element['_source']['AuditInfo']['JobMessageData']['FunctionName'];
                    const addonUUID = element['_source']['AuditInfo']['JobMessageData']['AddonUUID'];
                    const duration = element['_source']['AuditInfo']['JobMessageData']['Duration'];

                    this.updateDurationMap(functionDurationMap, `${functionName}_${addonUUID}`, duration, addonUUID, functionName); // update functionDurationMap
                    this.updateAddonsMapping(addonUUID); // update addonNameMap- insert all addonUUIDs to the map as a key
                });
                await this.getAddons();  // extract all addonUUIDs and update addonNameMap- insert all addon Names to the map as a value
                functionDurationMap.forEach((value) => { // create relation result object which will be the data sent to the relation
                    const name = `${value.FunctionName}_${this.addonNameMap.get(value.AddonUUID)}`;
                    this.upsertRelationData(this.relationResultObject, name, value.Duration);
                })
                return this.relationResultObject;
            }
        } catch(err){
            throw new Error(`getComputingTime function, error: ${err}`);
        }
    }

    updateDurationMap(functionDurationMap: Map<string, addonNameDurationObject>, key: string, value: number, addonUUID: string, functionName: string): Map<string, addonNameDurationObject> {
        if(functionDurationMap.has(key)){ // update the entry
            const addonNameDurationMap: addonNameDurationObject =  functionDurationMap.get(key)!;
            const lastDuration: number = addonNameDurationMap.Duration;
            functionDurationMap.set(key, {Duration: value + lastDuration, AddonUUID: addonUUID, FunctionName: functionName});
        } else{ // create a new map entry
            functionDurationMap.set(key, {Duration: value, AddonUUID: addonUUID, FunctionName: functionName})
        }
        return functionDurationMap;

    }

    // update addonNameMap with addonUUID as key and an empty string as addonName value
    updateAddonsMapping(addonUUID: string){
        if(this.addonNameMap.has(addonUUID)){ // update the entry
            this.addonNameMap.set(addonUUID, "" + this.addonNameMap.get(addonUUID));
        } else{ //create a new map entry
            this.addonNameMap.set(addonUUID, "")
        }
    }

    // call /addons with all UUIDs to get a map for addon uuid - addon name
    async getAddons() {
        try{
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
        } catch(err){
            console.log(`Could not get addons data, error: ${err}`);
        }
        
    }    

    // get the data from the last day, where auditType is sync_action and filter current distributorUUID.
    async getComputedTimeDataFromElastic(){
        let timestamp = new Date(new Date().setDate(new Date().getDate() - 1));

        const date = [
            timestamp.getUTCFullYear(),      // year
            ('0' + (timestamp.getUTCMonth() + 1)).slice(-2),  // month
            ('0' + (timestamp.getUTCDate())).slice(-2)   // day
        ].join('-');

        const elasticEndpoint = `${indexName}/_search`;

        // filter distributorUUID, time (last day), and auditType (sync_action)
        const requestBody = {
            "query": { 
                "bool": { 
                  "filter": [ 
                    { "term":  { "AuditType": `${auditType}`  }},
                    { "term":   { "AuditInfo.JobMessageData.DistributorUUID.keyword": `${this.distributorUUID}` }},
                    { "range": { "CreationDateTime": { "gte": `${date}T00:00:00.000Z`, "lte": `${date}T23:59:59.000Z` }}}
                  ]
                }
              },
            "size": 1000
        }

        try{
            console.log(`About to search data in elastic, requested date: ${timestamp}, elastic requested URL: ${elasticEndpoint}`);
            const res = await callElasticSearchLambda(elasticEndpoint, 'POST', requestBody);
            console.log("Successfully got data from elastic.");
            return res;
        } catch(err){
            throw new Error(`Could not search data in elastic, requested date: ${timestamp}, error: ${err}`);
        }

    }

    // update the data object that will be sent to the relation
    upsertRelationData(relationResultObject: relationResultType[], name: string, value: number){
        const description: string = "Total computing time (minutes) in the last 7 days";
        let resource = {
            Data:  name,
            Description: description,
            Size: value
        };
        relationResultObject.push(resource);
    }

}