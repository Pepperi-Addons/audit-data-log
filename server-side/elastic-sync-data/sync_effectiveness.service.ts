import { BaseSyncAggregationService } from "./base-sync-aggregation.service";
import { SYNC_FUNCTION_NAME, SYNC_UUID } from "../entities";

export class SyncEffectivenessService extends BaseSyncAggregationService {

    maintenanceWindow: number[] = [];
    
    fixElasticResultObject(auditLogData) {
      let res = {};      
      const aggregationResult = auditLogData?.resultObject?.aggregations?.aggregation_buckets?.buckets;
      aggregationResult.forEach(element => {
        let aggregationResult = element?.status_filter?.buckets
        res[element?.key_as_string] = this.calculateSync(aggregationResult?.failure.doc_count, aggregationResult?.total.doc_count) || ''
        
      });
      return res;
    }
    
    private calculateSync(failureCount: number, numberOfSyncs: number) {
        if(numberOfSyncs) {
            return `${((1 - (failureCount / numberOfSyncs)) * 100).toFixed(2)}%`;
        }
    }

    async getSyncsResult() {
      this.maintenanceWindow = await this.getMaintenanceWindowHours();
      return await this.getUptimeSync();
    }

    getStatusAggregationQuery() {
      return {}
    }

    private async getUptimeSync() {
        const monthlyDatesRange = {
            "range": {
              "CreationDateTime": {
                "gte": "now/M-1M/M", 
                "lt": "now"
              }
            }
          }

        const globalMaintenanceWindow = await this.getGlobalMaintenanceWindow();
        const syncAggregationQuery = this.getSyncAggregationQuery(monthlyDatesRange, globalMaintenanceWindow);
  
        const auditLogData = await this.getElasticData(syncAggregationQuery);
        const lastMonthDates = this.getFirstLogsDate(auditLogData);
  
        return { data: this.fixElasticResultObject(auditLogData) , dates: lastMonthDates };
    }
    

    getSyncAggregationQuery(auditLogDateRange, globalMaintenanceWindow: { Expression: string, Duration: number }[]) {
      return {
        "size": 1,
        "_source": ["CreationDateTime"],
        "sort": [
            {
              "CreationDateTime": {
                "order": "asc"
              }
            }
        ],
        "query": { 
          "bool": {
            "must": [
              this.createQueryTerm("AuditInfo.JobMessageData.AddonData.AddonUUID.keyword", SYNC_UUID),
              this.createQueryTerm("DistributorUUID.keyword", this.distributorUUID),
              this.createQueryTerm("AuditInfo.JobMessageData.FunctionName.keyword", SYNC_FUNCTION_NAME),
              this.getMaintenanceWindowHoursScript(this.maintenanceWindow),
              auditLogDateRange
            ],
            ...this.generateExcludedDateTime(globalMaintenanceWindow)
          }
        },
        "aggs": {
            "aggregation_buckets": {
                "date_histogram": {
                    "field": "AuditInfo.JobMessageData.StartDateTime",
                    "calendar_interval": "1M",
                    "format": "MM/yyyy",
                    "min_doc_count": 0
                },
                "aggs": {
                    "status_filter": {
                        "filters": {
                          "filters": {
                            "total": {
                              "bool": {}
                            },
                            "failure": {
                              "term": {
                                "Status.Name.keyword": "Failure"
                              }
                            }
                          }
                        }
                      }
                }
            }
        }
      }
  }

  // calculate dates range of previous month logs
  private getFirstLogsDate(auditLogData) {
    let returnedObject: string = '';
    const today= new Date();
    const dateMonthAgo = new Date(today.getFullYear(), today.getMonth(), 0); // get the last day of previous month

    const logsStartDate = new Date(auditLogData.resultObject.hits.hits[0]?._source?.CreationDateTime); // get the first log date
    if(logsStartDate && logsStartDate.getMonth() === dateMonthAgo.getMonth()) { // if there's data in the last month
      const firstLogsDay = logsStartDate.getDate();
      const lastLogsDay = dateMonthAgo.getDate();

      returnedObject = `${firstLogsDay}-${lastLogsDay}/${dateMonthAgo.getMonth() + 1}` // return dates range in dd1-dd2/mm format
    }
    return returnedObject;
  }
}
