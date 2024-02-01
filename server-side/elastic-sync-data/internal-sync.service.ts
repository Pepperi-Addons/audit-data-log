import { Client } from "@pepperi-addons/debug-server/dist";
import { SYNCS_PAGE_SIZE } from "../entities";
import { BaseElasticSyncService } from "./base-elastic-sync.service";
import { parse, toKibanaQueryJSON, concat } from '@pepperi-addons/pepperi-filters';

export class InternalSyncService extends BaseElasticSyncService {
    private codeJobUUID: string;

    constructor(client: Client, ownerID: string, codeJobUUID: string, params) {
        super(client, ownerID, params);
        this.codeJobUUID = codeJobUUID;
    }
    
    async getSyncsResult() {
        const res = await this.getElasticData(this.getSyncBody());
        return { data: this.fixElasticResultObject(res), 
            searchAfter: res.resultObject.hits.hits?.[res.resultObject.hits.hits.length - 1]?.sort?.[0], // update search_after according to the last doucumnet in the list
            size: res.resultObject.hits.total.value }; // update total number of documents
    }

    fixElasticResultObject(res) {
        return res.resultObject.hits.hits.map((item) => {
            return {
                UUID: item._source.UUID,
                Status: item._source.Status.Name,
                StartDateTime: item._source.AuditInfo.JobMessageData.StartDateTime
            };
        });
    }

    private getSyncBody() {
        const typesMapping = {};
        const whereClause = `AuditInfo.JobMessageData.CodeJobUUID.keyword='${this.codeJobUUID}'`
        
        const typesArray = ["AuditInfo.JobMessageData.CodeJobUUID.keyword"];

        Object.values(typesArray).forEach((value) => {
            typesMapping[value] = 'String';
        });

        const result = parse(whereClause, typesMapping);
        const conct = this.params.Where ? concat(true, result!, this.params.Where) : result;
        const kibanaQuery = toKibanaQueryJSON(conct);            
        return this.buildQueryParameters(kibanaQuery, SYNCS_PAGE_SIZE);
    }
}