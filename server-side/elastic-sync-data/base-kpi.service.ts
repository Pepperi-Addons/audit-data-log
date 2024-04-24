import { BaseSyncAggregationService } from "./base-sync-aggregation.service";

export abstract class BaseKPIService extends BaseSyncAggregationService {

    maintenanceWindow: number[] = [];
    protected abstract calculatePercentage(failureCount: number, range: number);
    
    protected async getUptimeSync() {
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
        
        return { AuditLogData: auditLogData, LastMonthDates: lastMonthDates };
    }

  // calculate dates range of previous month logs
  private getFirstLogsDate(auditLogData) {
    let returnedObject: { Range: string, NumberOfDays: number } = { Range: '', NumberOfDays: 0 };
    const today= new Date();
    const dateMonthAgo = new Date(today.getFullYear(), today.getMonth(), 0); // get the last day of previous month

    const logsStartDate = new Date(auditLogData.resultObject.hits.hits[0]?._source?.CreationDateTime); // get the first log date
    if(logsStartDate && logsStartDate.getMonth() === dateMonthAgo.getMonth()) { // if there's data in the last month
      const firstLogsDay = logsStartDate.getDate();
      const lastLogsDay = dateMonthAgo.getDate();
      const numberOfDays = (lastLogsDay - firstLogsDay) || 1;

      returnedObject = {
        Range: `${firstLogsDay}-${lastLogsDay}/${dateMonthAgo.getMonth() + 1}`, // return dates range in dd1-dd2/mm format
        NumberOfDays: numberOfDays
      }; 
    }
    return returnedObject;
  }
}
