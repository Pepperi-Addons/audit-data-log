import { callElasticSearchLambda } from '@pepperi-addons/system-addon-utils';
import { parse, toKibanaQueryJSON } from '@pepperi-addons/pepperi-filters';
import { AUDIT_LOG_INDEX, HEALTH_MONITOR_ADDON_UUID } from '../entities';
import { Client } from '@pepperi-addons/debug-server/dist';
import { PapiClient } from '@pepperi-addons/papi-sdk';

export abstract class BaseElasticSyncService {
    papiClient: PapiClient;
    protected params: { SearchAfter?: any[], FromIndex?: number, Where?: any };

    constructor(protected client: Client, ownerID: string, params: { SearchAfter?: any[], FromIndex?: number, Where?: any } = {}) {
        this.papiClient = new PapiClient({
            baseURL: client.BaseURL,
            token: client.OAuthAccessToken,
            addonUUID: client.AddonUUID,
            addonSecretKey: client.AddonSecretKey,
            actionUUID: client.ActionUUID
        });
        this.validateAddon(ownerID); // only health monitor addon can use this service
        this.params = params;
    }

    protected abstract getSyncsResult();

    protected abstract fixElasticResultObject(res, period);

    validateAddon(ownerID: string){
        if(ownerID !== HEALTH_MONITOR_ADDON_UUID) {
            throw new Error(`Only health monitor addon can use this service`);
        }
    }

    protected async getElasticData(requestBody) {   
        const elasticEndpoint = `${AUDIT_LOG_INDEX}/_search`;
        try{
            console.log(`About to search data in elastic`);
            const res = await callElasticSearchLambda(elasticEndpoint, 'POST', requestBody );
            console.log("Successfully got data from elastic.");
            return res;
        } catch(err){
            throw new Error(`Could not search data in elastic, error: ${err}`);
        }
    }

    protected getElasticBody(query: string, fieldsMap, size: number) {
        const result = parse(query, fieldsMap);
        const kibanaQuery = toKibanaQueryJSON(result);

        return this.buildQueryParameters(kibanaQuery, size);
    }

    protected buildQueryParameters(kibanaQuery, size: number) {
        const body = {
            query: kibanaQuery,
            sort: [
                {
                  "AuditInfo.JobMessageData.StartDateTime": {
                    "order": "desc"
                  }
                }
            ],
            track_total_hits: true, // return total number of documents, for getting all items in the list
            size: size
        }
        if(this.params.SearchAfter && this.params.SearchAfter.length > 0) {
            body['search_after'] = this.params.SearchAfter;
        }
        if(this.params.FromIndex) {
            body['from'] = this.params.FromIndex;
        }
        return body;
    }

    protected createQueryTerm(field: string, value: string) {
        return {
            term: {
                [field]: value
            }
        }
    }

    // return a script checking if the creation date is not within the maintenance window hours (to exclude syncs created during maintenance window)
    protected getMaintenanceWindowHoursScript(maintenanceWindow: number[]) {
        return {
            bool: {
                must: {
                    script: {
                        script: { // excluding maintenance window hours
                            source: `
                                def targetHour = doc['CreationDateTime'].value.hourOfDay;
                                def targetMinute = doc['CreationDateTime'].value.minuteOfHour;
                                
                                def targetTime = targetHour * 60 + targetMinute;
                                def startTime = ${maintenanceWindow[0]} * 60 + ${maintenanceWindow[1]};
                                def endTime = ${maintenanceWindow[0] + 1} * 60 + ${maintenanceWindow[1]};
                                
                                return targetTime < startTime || targetTime > endTime;
                            `
                        }
                    }
                }
            }
        }
    }

    protected async getMaintenanceWindowHours() {
        try {
            const maintenanceWindow = (await this.papiClient.metaData.flags.name('Maintenance').get()).MaintenanceWindow;
            return (maintenanceWindow.split(':')).map((item) => { return parseInt(item)} );
        } catch(err) {
            console.log(`error getting maintenance window: ${err}`);
        }
    }
}