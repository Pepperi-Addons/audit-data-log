import { Client } from "@pepperi-addons/debug-server/dist";
import { SYNCS_PAGE_SIZE } from "../entities";
import { BaseElasticSyncService } from "./base-elastic-sync.service";

export class InternalSyncService extends BaseElasticSyncService {
    private codeJobUUID: string;

    constructor(client: Client, ownerID: string, codeJobUUID: string) {
        super(client, ownerID);
        this.codeJobUUID = codeJobUUID;
    }
    
    async getSyncsResult() {
        const query: string = `AuditInfo.JobMessageData.CodeJobUUID.keyword='${this.codeJobUUID}'`;

        const requestedBody = this.getElasticBody(query, { "AuditInfo.JobMessageData.CodeJobUUID.keyword" : 'String' }, SYNCS_PAGE_SIZE);
        const res = await this.getElasticData(requestedBody);
        return this.fixElasticResultObject(res);
    }

    fixElasticResultObject(res) {
        return res.resultObject.hits.hits.map((item) => {
            let jobStatus = 'Failed';
            if(item._source.AuditInfo.ResultObject) {
                try{
                    const status = JSON.parse(item._source.AuditInfo.ResultObject);
                    jobStatus = status.success ? 'Success' : 'Failed';
                } catch(err) {
                    console.log(`Could not parse sync result object, error: ${err}`);
                }
            }
            return {
                UUID: item._source.UUID,
                Status: jobStatus,
                StartDateTime: item._source.AuditInfo.JobMessageData.StartDateTime
            };
        });
    }
}