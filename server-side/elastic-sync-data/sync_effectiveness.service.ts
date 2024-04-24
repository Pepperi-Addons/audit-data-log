import { SYNC_FUNCTION_NAME, SYNC_UUID } from "../entities";
import { BaseKPIService } from "./base-kpi.service";

export class SyncEffectivenessService extends BaseKPIService {

    maintenanceWindow: number[] = [];
    
    protected fixElasticResultObject(auditLogData) {
      let res = {};      
      const aggregationResult = auditLogData?.resultObject?.aggregations?.aggregation_buckets?.buckets;
      aggregationResult.forEach(element => {
        let aggregationResult = element?.status_filter?.buckets
        res[element?.key_as_string] = this.calculatePercentage(aggregationResult?.failure.doc_count, aggregationResult?.total.doc_count) || ''
        
      });
      return res;
    }
    
    protected calculatePercentage(failureCount: number, numberOfSyncs: number) {
        if(numberOfSyncs) {
            return `${((1 - (failureCount / numberOfSyncs)) * 100).toFixed(2)}%`;
        }
    }

    async getSyncsResult() {
      this.maintenanceWindow = await this.getMaintenanceWindowHours();
      const result = await this.getUptimeSync();
      return { data: this.fixElasticResultObject(result.AuditLogData) , dates: result.LastMonthDates.Range };
    }

    getStatusAggregationQuery() {
      return {}
    }

    protected getSyncAggregationQuery(auditLogDateRange, globalMaintenanceWindow: { Expression: string, Duration: number }[]) {
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
}
