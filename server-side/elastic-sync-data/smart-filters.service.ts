import { Client } from "@pepperi-addons/debug-server/dist";
import { SYNC_FUNCTION_NAME, SYNC_UUID } from "../entities";
import { BaseElasticSyncService } from "./base-elastic-sync.service";
import { parse, toKibanaQueryJSON, concat } from '@pepperi-addons/pepperi-filters';
import jwtDecode from "jwt-decode";

export class SmartFilters extends BaseElasticSyncService {
    private codeJobUUID: string;
    private dataType: 'InternalSync' | 'SyncJob';

    constructor(client: Client, ownerID: string, codeJobUUID: string, params, dataType: 'InternalSync' | 'SyncJob') {
        super(client, ownerID, params);
        this.codeJobUUID = codeJobUUID;
        this.dataType = dataType;
    }
    
    async getSyncsResult() {
        const filteredSyncs = await this.getElasticData(this.getQueryDSL());
        let uniqueValues = {
            StatusNames: filteredSyncs.resultObject?.aggregations?.status_distinct_values.buckets.map(element =>{ return { Key: element.key, Value: element.key }} )
        }

        if(this.dataType === 'SyncJob') {
            uniqueValues['UserNames'] = filteredSyncs.resultObject?.aggregations?.user_distinct_values.buckets.map(element =>{ return { Key: element.key, Value: element.key }} );
        }
    
        return uniqueValues;
    }

    fixElasticResultObject(res) {
        return res.resultObject.hits.hits.map((item) => {
            let jobStatus = 'Failed';
            if(item._source.AuditInfo.ResultObject) {
                try{
                    const status = JSON.parse(item._source.AuditInfo.ResultObject);
                    jobStatus = status.success ? 'Success' : 'Failed';
                } catch(err) {
                    console.error(`Could not parse sync result object, error: ${err}`);
                }
            }
            return {
                UUID: item._source.UUID,
                Status: jobStatus,
                StartDateTime: item._source.AuditInfo.JobMessageData.StartDateTime,
                NumberOfTry: item._source.AuditInfo.JobMessageData.NumberOfTry
            };
        });
    }

    private getQueryDSL() {
        let filters;
        let typesArray;
        const typesMapping = {};

        if(this.dataType === 'InternalSync') {
            filters = `AuditInfo.JobMessageData.CodeJobUUID.keyword='${this.codeJobUUID}'`
            typesArray = ["AuditInfo.JobMessageData.CodeJobUUID.keyword"];
        } else if(this.dataType === 'SyncJob') {
            const distributorUUID = (<any>jwtDecode(this.client.OAuthAccessToken))["pepperi.distributoruuid"];

            const whereClauses = [
                `AuditInfo.JobMessageData.AddonData.AddonUUID.keyword='${SYNC_UUID}'`,
                `DistributorUUID.keyword='${distributorUUID}'`,
                `AuditInfo.JobMessageData.FunctionName.keyword='${SYNC_FUNCTION_NAME}'`];
            filters = whereClauses.join(' AND ');
            
            typesArray = ["AuditInfo.JobMessageData.AddonData.AddonUUID.keyword", "DistributorUUID.keyword", "AuditInfo.JobMessageData.FunctionName.keyword"];           
        }

        Object.values(typesArray).forEach((value: any) => {
            typesMapping[value] = 'String';
        });

        const result = parse(filters, typesMapping);
        const conct = this.params.Where ? concat(true, result!, this.params.Where) : result;
        const kibanaQuery = toKibanaQueryJSON(conct);            

        return this.getKibanaDSL(kibanaQuery);
    }

    private getKibanaDSL(kibanaQuery) {
        const kibanaDSL = {
            size: 10,
            query: kibanaQuery,
            aggs: {
                status_distinct_values: {
                    terms: {
                        field: "Status.Name.keyword",
                        size: 10000,
                        order: { "_key": "asc"}
                    }
                }
            }
        };

        if(this.dataType === 'SyncJob') {
            kibanaDSL.aggs['user_distinct_values'] = {
                terms: {
                    field: "Event.User.Email.keyword",
                    size: 10000,
                    order: { "_key": "asc"}
                }
            }
        }
        return kibanaDSL;
    }

    
}