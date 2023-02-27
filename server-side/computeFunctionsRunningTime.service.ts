import { Client } from '@pepperi-addons/debug-server/dist';
import { PapiClient } from '@pepperi-addons/papi-sdk';
import { callElasticSearchLambda } from '@pepperi-addons/system-addon-utils';
import jwtDecode from "jwt-decode";

const auditType= "sync_action";
const indexName = 'audit_log';

export type AddonType = { // addon UUID map type
    UUID: string,
    Name: string
};

export type AddonNameDurationObject = {
    Duration: number,
    AddonUUID: string,
    FunctionName: string
};

export type UsageResultObject = {
    Title: string;
    Resources: RelationResultType[];
}

export class RelationResultType {
    Data: string;
    Description: string;
    Size: number;

    constructor(Data: string, Size: number){
        this.Data = Data;
        this.Description = "Total computing time (minutes) in the last 7 days";
        this.Size = Size;
    }
};

// compute functions running time per day-
// get last day data from elastic
// according that, create the result object for the relation 
// result object - FunctionName_addonUUID + the relevent function duration
export class ComputeFunctionsDuration{
    papiClient: PapiClient;
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
    
    async getComputedTimeForUsage(): Promise<UsageResultObject>{
        const resource: RelationResultType[] = await this.getComputingTimeInTheLastDay();
        const returnedObject = {
            "Title": "Computing Time",
            "Resources": resource
        }
        return returnedObject;

    }

    async getComputingTimeInTheLastDay(): Promise<Array<RelationResultType>>
    {
        const timestamp = new Date(new Date().setDate(new Date().getDate() - 1));
        const date = [
            timestamp.getUTCFullYear(),      // year
            ('0' + (timestamp.getUTCMonth() + 1)).slice(-2),  // month
            ('0' + (timestamp.getUTCDate())).slice(-2)   // day
        ].join('-');

        const fromDate: Date = new Date(`${date}T00:00:00.000Z`);
        const toDate: Date = new Date(`${date}T23:59:59.000Z`);

        return await this.getComputingTime(fromDate, toDate);
    }
   
    async getComputingTime(fromDate: Date, toDate: Date): Promise<Array<RelationResultType>>
    {
        let relationResultObject: RelationResultType[] = []; // the data sent to the relation
        try{
            // step 1 - get all relevant data from elastic
            let res = await this.getComputedTimeDataFromElastic(fromDate, toDate); 
            if(res.success){
                // step 2 - extract all addonUUIDs and update addonNameMap- insert all addon Names to the map as a value
                await this.updateAddonUUIDictionary(res); 
                // step 3 - modify the data to usage monitor relation data. Create relation result object which will be the data sent to the relation 
                this.createUsageRelationData(res, relationResultObject) 
            }
        } catch(err){
            throw new Error(`getComputingTime function, error: ${err}`);
        }
        return relationResultObject;
    }

    createUsageRelationData(res, relationResultObject: RelationResultType[]){
        res.resultObject.aggregations.aggragateByAddonUUID.buckets.forEach((element) => {                   
            const addonUUID = this.addonNameMap.get(element.key)
            element.aggragateByFunctionName.buckets.forEach(addonElement => {
                const functionName = addonElement.key;
                const duration = addonElement.durationSum.value;
                const name = `${functionName}_${addonUUID}`;
                const relationData: RelationResultType  = new RelationResultType(name, duration);
                relationResultObject.push(relationData);
            });
            
        })
    }

    async updateAddonUUIDictionary(res){
        res.resultObject.aggregations.aggragateByAddonUUID.buckets.forEach(element => { //for each element returned from elastic-
            const addonUUID = element.key;
            this.updateAddonsMapping(addonUUID); // update addonNameMap- insert all addonUUIDs to the map as a key
        });

        await this.getAddons();
    }


    
    // update duration map - if the data is for the same function- add its duration to the relevant key in the map (key is functionName_addonUUID)
    updateDurationMap(functionDurationMap: Map<string, AddonNameDurationObject>, key: string, value: number, addonUUID: string, functionName: string): Map<string, AddonNameDurationObject> {
        if(functionDurationMap.has(key)){ // update the entry
            const addonNameDurationMap: AddonNameDurationObject =  functionDurationMap.get(key)!;
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


    // call addons table with all UUIDs to get a map for addon uuid - addon name
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
    async getComputedTimeDataFromElastic(fromDate: Date, toDate: Date){
        let res;
        
        const elasticEndpoint = `${indexName}/_search`;
        // filter distributorUUID, time (last day), and auditType (sync_action)
        const requestBody = {
            "query": { 
                "bool": { 
                  "filter": [ 
                    { "term":  { "AuditType": `${auditType}`  }},
                    { "term":   { "AuditInfo.JobMessageData.DistributorUUID.keyword": `${this.distributorUUID}` }},
                    { "range": { "CreationDateTime": { "gte": fromDate, "lte": toDate }}}
                  ]
                }
              },
              "aggs": {
                "aggragateByAddonUUID":{
                  "terms": {
                    "field": "AuditInfo.JobMessageData.AddonUUID.keyword",
                    "size": 100
                  },
                  "aggs": {
                    "aggragateByFunctionName": {
                      "terms": {
                        "field": "AuditInfo.JobMessageData.FunctionName.keyword"
                      },
                      "aggs": {
                        "durationSum": {
                          "sum": {
                            "field": "AuditInfo.JobMessageData.Duration"
                          } 
                        }
                      }
                    }
                  }
                }
              }
        }

        try{
            console.log(`About to search data in elastic, requested date: ${fromDate}, elastic requested URL: ${elasticEndpoint}`);
            res = await callElasticSearchLambda(elasticEndpoint, 'POST', requestBody);
            console.log("Successfully got data from elastic.");
        } catch(err){
            throw new Error(`Could not search data in elastic, requested date: ${fromDate}, error: ${err}`);
        }
        return res;
    }

    // update the data object that will be sent to the relation
    upsertRelationData(relationResultObject: RelationResultType[], name: string, value: number){
        const description: string = "Total computing time (minutes) in the last 7 days";
        let resource = {
            Data:  name,
            Description: description,
            Size: value
        };
        relationResultObject.push(resource);
    }

}