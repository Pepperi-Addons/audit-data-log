import { callElasticSearchLambda } from '@pepperi-addons/system-addon-utils';
import { parse, toKibanaQueryJSON } from '@pepperi-addons/pepperi-filters';
import { AUDIT_LOGS_WEEKS_RANGE, AUDIT_LOG_INDEX, HEALTH_MONITOR_ADDON_UUID, KMS_KEY } from '../entities';
import { Client } from '@pepperi-addons/debug-server/dist';
import { PapiClient } from '@pepperi-addons/papi-sdk';
import parser from 'cron-parser';

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

  // get all global maintenance occurrences in the last AUDIT_LOGS_WEEKS_RANGE weeks, and add the range to the must_not array to exclude them from the logs
  protected generateExcludedDateTime(globalMaintenanceWindow: { Expression: string, Duration: number }[]): { must_not: any[] } {
    let prev: parser.CronDate;
    const mustNotArray: any = [];
    const now = new Date();
    const logsStartDate = new Date(now.setDate(now.getDate() - (AUDIT_LOGS_WEEKS_RANGE * 7))); // get AUDIT_LOGS_WEEKS_RANGE weeks ago date

    for(const expression of globalMaintenanceWindow) {
      try{
        const interval = parser.parseExpression(expression.Expression, { utc: true });
        
        while((prev = interval.prev()).getTime() >= logsStartDate.getTime()) { // while the current date is greater than the start of the logs date
          const endDate = new Date(prev.getTime() + expression.Duration * 60 * 60 * 1000); // convert the duration to miliseconds, and add the it to the start time, to get the end time of the maintenance window
          mustNotArray.push({ range: { CreationDateTime: { gte: prev.toISOString(), lte: endDate.toISOString() } } });
        }
      } catch(err) {
        console.error(`Could not parse cron expression: ${expression.Expression}, error: ${err}`);
      }
    }

    return { must_not: mustNotArray };
  }
  
  // get global maintenance window from KMS
  protected async getGlobalMaintenanceWindow(): Promise<{ Expression: string, Duration: number }[]> {
    try{
      console.log(`About to get KMS parameter: ${KMS_KEY}`);
      const res: string = (await this.papiClient.get(`/kms/parameters/${KMS_KEY}`)).Value;
      console.log(`Successfully got KMS parameter: ${KMS_KEY}`);
      return JSON.parse(res);
    } catch(err){
      console.error(`Could not get KMS parameter: ${KMS_KEY}, error: ${err}`);
      throw err;
    }
  }
}