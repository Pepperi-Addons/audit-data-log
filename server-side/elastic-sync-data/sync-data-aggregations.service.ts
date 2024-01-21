import { Client } from "@pepperi-addons/debug-server/dist";
import { AggregationDataType, SYNC_FUNCTION_NAME, SYNC_UUID } from "../entities";
import { BaseSyncAggregationService } from "./base-sync-aggregation.service";

export class SyncDataAggregations extends BaseSyncAggregationService {

  maintenanceWindow: number[] = [];
  dataType: AggregationDataType;

  constructor(client: Client, ownerID: string, dataType: AggregationDataType) {
    super(client, ownerID);
    this.dataType = dataType;
  }

  fixElasticResultObject(res, aggregationFieldName = "aggregation_buckets") {
    let jobStatus = {};
    const fixedObject = res.resultObject.aggregations[aggregationFieldName].buckets;

    if (aggregationFieldName === "status_filter") {
      jobStatus['data'] = Object.values(fixedObject).map((item: any) => { return item.doc_count })
    } else if (aggregationFieldName === "aggregation_buckets") {
      jobStatus['dates'] = fixedObject.map((item) => { return item.key_as_string });
      jobStatus['data'] = fixedObject.map((item) => { return Object.values(item.status_filter.buckets).map((element: any) => { return element.doc_count }) })
    }

    return jobStatus;
  }

  async getSyncsResult() {
    let syncResponse;
    this.maintenanceWindow = await this.getMaintenanceWindowHours();

    switch (this.dataType) {
      case 'HourlySyncs':
        { // get all the syncs distributed by hours (in the last 24 hours), filtered by success, delayed and failure
          const gte = "now-24h";
          const histogramAdditionalParams = {
            interval: "1h",
            format: "HH:mm",
            extended_bounds: {
              "min": "now-24h",
              "max": "now"
            }
          }

          const dataAggregation = await this.getSyncAggregationResult(gte, histogramAdditionalParams);
          syncResponse = this.fixElasticResultObject(dataAggregation);
          break;
        }
      case 'LastDaySyncs':
        {
          syncResponse = await this.getlastDaySyncs();
          break;
        }
      case 'WeeklySyncs':
        {  // get all syncs in the last 7 days, distributed by weeks
          const gte = "now-5w/w-1w/d";
          const histogramAdditionalParams = {
            calendar_interval: "1w",
            offset: "-1d",
            format: "dd-MM-yyyy",
            min_doc_count: 0
          }

          const dataAggregation = await this.getSyncAggregationResult(gte, histogramAdditionalParams);
          syncResponse = this.fixElasticResultObject(dataAggregation);
          break;

        }
        case 'MonthlySyncs':
        {  // get all the syncs distributed by months (in the last 2 months)
          const gte = "now/M-1M/M";
          const histogramAdditionalParams = {
            calendar_interval: "1M",
            format: "MM/yyyy",
            min_doc_count: 0,
            extended_bounds: {
              min: "now/M-1M/M",
              max: "now/M"
            }
          }

          const dataAggregation = await this.getSyncAggregationResult(gte, histogramAdditionalParams);
          syncResponse = this.getMonthlySyncs(dataAggregation);
          break;

        }
      default:
        break;
    }

    return syncResponse;
  }
  
  private async getSyncAggregationResult(gte, histogramAdditionalParams) {
    const datesRange = {
      "range": {
        "AuditInfo.JobMessageData.StartDateTime": {
          "gte": gte,
          "lt": "now"
        }
      }
    }

    const aggregationQuery = {
      "aggs": {
        "aggregation_buckets": {
          "date_histogram": {
            "field": "AuditInfo.JobMessageData.StartDateTime",
            ...histogramAdditionalParams
          },
          ...this.getStatusAggregationQuery()
        }
      }
    }
    const body = this.getSyncAggregationQuery(aggregationQuery, datesRange);
    return await this.getElasticData(body);
  }

  // get all syncs in the last 24 hours
  private async getlastDaySyncs() {
    const dailyDatesRange = {
      "range": {
        "AuditInfo.JobMessageData.StartDateTime": {
          "gte": "now-24h",
          "lt": "now"
        }
      }
    }

    const body = this.getSyncAggregationQuery(this.getStatusAggregationQuery(), dailyDatesRange);
    const auditLogData = await this.getElasticData(body);
    return this.fixElasticResultObject(auditLogData, 'status_filter');
  }

  // get all the syncs distributed by months (in the last 2 months)
  private getMonthlySyncs(auditLogData) {
    const lastMonthDates = this.getLastMonthLogsDates()
    const fixedResult = this.fixElasticResultObject(auditLogData);
    fixedResult['dates'][0] = lastMonthDates;
    return fixedResult;
  }

  getSyncAggregationQuery(statusesAggregation, auditLogDateRange) {
    return {
      "size": 0,
      "query": {
        "bool": {
          "must": [
            this.createQueryTerm("AuditInfo.JobMessageData.AddonData.AddonUUID.keyword", SYNC_UUID),
            this.createQueryTerm("DistributorUUID.keyword", this.distributorUUID),
            this.createQueryTerm("AuditInfo.JobMessageData.FunctionName.keyword", SYNC_FUNCTION_NAME),
            this.getMaintenanceWindowHoursScript(this.maintenanceWindow),
            auditLogDateRange
          ]
        }
      },
      ...statusesAggregation
    }
  }

  // get status aggregation query, filtered by success, delayed and failure
  getStatusAggregationQuery() {
    return {
      "aggs": {
        "status_filter": {
          "filters": {
            "filters": {
              "success": {
                "bool": {
                  "must": [
                    {
                      "term": {
                        "Status.Name.keyword": "Success"
                      }
                    },
                    {
                      "range": {
                        "AuditInfo.JobMessageData.NumberOfTry": {
                          "lt": 12
                        }
                      }
                    }
                  ]
                }
              },
              "delayed": {
                "bool": {
                  "must": [
                    {
                      "term": {
                        "Status.Name.keyword": "Success"
                      }
                    },
                    {
                      "range": {
                        "AuditInfo.JobMessageData.NumberOfTry": {
                          "gte": 12
                        }
                      }
                    }
                  ]
                }
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