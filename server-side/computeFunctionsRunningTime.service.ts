import { Client } from '@pepperi-addons/debug-server/dist';
import { callElasticSearchLambda } from '@pepperi-addons/system-addon-utils';
import jwtDecode from "jwt-decode";
import { Addons } from './addons';
import { ElasticResultFirstType, ElasticResultSecondType } from './elastic-result-type';

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
    distributorUUID: string;
    addonsList: Addons = new Addons(this.client);;

    constructor(private client: Client) {
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

    // initiate getComputingTime with the last day as a date.
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
            // #1 - get all relevant data from elastic
            let res: ElasticResultFirstType | ElasticResultSecondType= await this.getComputedTimeDataFromElastic(fromDate, toDate); 
            if(res.success){
                // #2 - extract all addonUUIDs and update addonNameMap- insert all addon Names to the map as a value
                await this.addonsList.getAddonNamesAndUpdateMap(res.resultObject!); 
                // #3 - modify the data to usage monitor relation data. Create relation result object which will be the data sent to the relation 
                this.upsertUsageRelationData(res, relationResultObject) 
            }
        } catch(err){
            throw new Error(`getComputingTime function, error: ${err}`);
        }
        return relationResultObject;
    }

    // for each addonUUID bucket- get the current addonUUID, transalte into addonName, and go over all function names belongs to the current addon.
    // for each function, upsert the data for addonName_functionName to relationResultObject.
    upsertUsageRelationData(res, relationResultObject: RelationResultType[]){
        res.resultObject.aggregations.aggragateByAddonUUID.buckets.forEach((element) => {                   
            const addonName = this.addonsList.addonNameMap.get(element.key)
            element.aggragateByFunctionName.buckets.forEach(addonElement => {
                const functionName = addonElement.key;
                const duration = addonElement.durationSum.value;
                const name = `${addonName}_${functionName}`;
                const relationData: RelationResultType  = new RelationResultType(name, duration);
                relationResultObject.push(relationData);
            });
        })
    }

    // get the data from the last day, where auditType is sync_action and filter current distributorUUID.
    async getComputedTimeDataFromElastic(fromDate: Date, toDate: Date): Promise<ElasticResultFirstType | ElasticResultSecondType>{
        let res: ElasticResultFirstType | ElasticResultSecondType;
        
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