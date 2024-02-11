import { MAXIMUM_NEMBER_OF_ITEMS, SYNCS_PAGE_SIZE, SYNC_FUNCTION_NAME, SYNC_UUID } from "../entities";
import { BaseElasticSyncService } from "./base-elastic-sync.service";
import jwtDecode from "jwt-decode";
import { parse, toKibanaQueryJSON, concat } from '@pepperi-addons/pepperi-filters';

export class SyncJobsService extends BaseElasticSyncService {
    
    async getSyncsResult() {
        const maintenanceWindow = await this.getMaintenanceWindowHours();
        const distributorUUID = (<any>jwtDecode(this.client.OAuthAccessToken))["pepperi.distributoruuid"];
        const res = await this.getElasticData(this.getSyncBody(maintenanceWindow, distributorUUID));
        return { data: this.fixElasticResultObject(res), 
            searchAfter: res.resultObject.hits.hits?.[res.resultObject.hits.hits.length - 1]?.sort?.[0], // update search_after according to the last doucumnet in the list
            size: Math.min(res.resultObject.hits.total.value, MAXIMUM_NEMBER_OF_ITEMS) }; // update total number of documents
    }

    fixElasticResultObject(res) {
        return res.resultObject.hits.hits?.map((item) => {
            let syncObjects = {
                UUID: item._source['UUID'],
                CreationDateTime: item._source['CreationDateTime'],
                ModificationDateTime: item._source['ModificationDateTime'],
                User: item._source.Event.User.Email,
                Status: item._source.Status.Name,
                NumberOfTry: item._source.AuditInfo.JobMessageData.NumberOfTry,
            }
            if (item._source.AuditInfo.ResultObject) {
                try {
                    const resultObject = JSON.parse(item._source.AuditInfo.ResultObject);
                    return {
                        ...syncObjects,
                        PepperiVersion: resultObject?.ClientInfo?.SoftwareVersion || "",
                        Device: (resultObject?.ClientInfo?.DeviceName + '(' + resultObject?.ClientInfo?.DeviceModel + ')') || "",
                        OSVersion: resultObject?.ClientInfo?.SystemVersion || "",
                        DeviceID: resultObject?.ClientInfo?.DeviceExternalID || "",
                        ClientType: resultObject?.ClientInfo?.SystemName || ""
                    }
                } catch(err) {
                    console.error(`Could not parse sync result object, error: ${err}`);
                }
            }
            return syncObjects;
        });
    }

    private getSyncBody(maintenanceWindow: number[], distributorUUID: string) {
        const typesMapping = {};
        const whereClauses = [
            `AuditInfo.JobMessageData.AddonData.AddonUUID.keyword='${SYNC_UUID}'`,
            `DistributorUUID.keyword='${distributorUUID}'`,
            `AuditInfo.JobMessageData.FunctionName.keyword='${SYNC_FUNCTION_NAME}'`];
        const filters = whereClauses.join(' AND ');
        
        const typesArray = ["AuditInfo.JobMessageData.AddonData.AddonUUID.keyword", "DistributorUUID.keyword", "AuditInfo.JobMessageData.FunctionName.keyword"];

        Object.values(typesArray).forEach((value) => {
            typesMapping[value] = 'String';
        });

        const result = parse(filters, typesMapping);
        const conct = this.params.Where ? concat(true, result!, this.params.Where) : result;
        const kibanaQuery = toKibanaQueryJSON(conct);

        kibanaQuery['bool']['must'].push(this.getMaintenanceWindowHoursScript(maintenanceWindow)); // add maintanance window script to the query (to exclude syncs that were created in the maintenance window)
            
        return this.buildQueryParameters(kibanaQuery, SYNCS_PAGE_SIZE);
    }
}
