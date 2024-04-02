import { Client } from "@pepperi-addons/debug-server/dist";
import { BaseSyncAggregationService } from "./base-sync-aggregation.service";
import { HOURS_IN_DAY, MINUTES_IN_HOUR, RETRY_OFF_TIME_IN_MINUTES } from "../entities";

const GAP_IN_SEQUENCE = 6;
const MILLISECONDS_IN_MINUTE = 60000;

export class UptimeSyncService extends BaseSyncAggregationService {


    private codeJobUUID: string = '';
    private monitorLevel: number = 0;
    maintenanceWindow: number[] = [];

    constructor(client: Client, ownerID: string, codejobUUID: string, monitorLevel: number) {
        super(client, ownerID);
        this.codeJobUUID = codejobUUID;
        this.monitorLevel = monitorLevel;
    }

    // get last day downtime value
    // downtime will be calculated as (5 * number of consecutive failed syncs)
    async getDailyDowntime() {
      if(this.monitorLevel) {
        const monthlyDatesRange = {
          "range": {
            "CreationDateTime": {
              "gte": "now-24h", 
              "lt": "now"
            }
          }
        }

        const globalMaintenanceWindow = await this.getGlobalMaintenanceWindow();
        const syncAggregationQuery = this.getSyncAggregationQuery(monthlyDatesRange, globalMaintenanceWindow);
  
        const auditLogData = await this.getElasticData(syncAggregationQuery);
        const res = this.removeNotInSequence(auditLogData.resultObject.hits.hits);
        return { Downtime: res.length * RETRY_OFF_TIME_IN_MINUTES };
      }
    }
    
    fixElasticResultObject(auditLogData, period) {
      let res = {};
      const today = new Date();
      const dateNow = today.getDate();
      const currentMonthKey = this.getObjectPropName(today);
      today.setDate(1); // setting the date to the first day of the month, to prevent the case where the current month has more days than the previous month (and then getting a wrong days calculation)
      today.setMonth(today.getMonth() - 1); // setting the month to the previous month.
      const lastMonthKey = this.getObjectPropName(today);

      const items = this.removeNotInSequence(auditLogData.resultObject.hits.hits)
      const months = this.groupByMonth(items);
      res[lastMonthKey] = this.calculateUpTime(months[lastMonthKey] || 0, period) || '';
      res[currentMonthKey] = this.calculateUpTime(months[currentMonthKey] || 0, dateNow);
      return res;
    }

    // The value is the number of sync monitor jobs runs that failed, multiply by 5 divide by (1440(=minutesInADay) * period(number of days in the month)).
    // (since each retry means 5 minutes without work.)
    private calculateUpTime(failureCount: number, period: number) {
      if(period) {
        const calculatedFailedSyncs = ((1 - ((failureCount * RETRY_OFF_TIME_IN_MINUTES) / (MINUTES_IN_HOUR * HOURS_IN_DAY * period))) * 100).toFixed(2);
        return `${calculatedFailedSyncs}%`; // update each month uptime sync value
      }
    }

    async getSyncsResult() {
      this.maintenanceWindow = await this.getMaintenanceWindowHours();
      return await this.getUptimeSync();
    }

    getStatusAggregationQuery() {
      return {}
    }

    async getUptimeSync() {
      if(this.monitorLevel) { // uptime sync cards are not available for monitor level 'Never' (0)
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
  
        return { data: this.fixElasticResultObject(auditLogData, lastMonthDates.NumberOfDays) , dates: lastMonthDates.Range };
      }
    }

    getSyncAggregationQuery(auditLogDateRange, globalMaintenanceWindow: { Expression: string, Duration: number }[]) {
      return {
        "size": 1000,
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
              this.createQueryTerm("AuditInfo.JobMessageData.CodeJobUUID.keyword", this.codeJobUUID),
              this.createQueryTerm("Status.Name.keyword", "Failure"),
              this.getMaintenanceWindowHoursScript(this.maintenanceWindow),
              auditLogDateRange
            ],
            ...this.generateExcludedDateTime(globalMaintenanceWindow)
          }
        }
      }
  }

  private removeNotInSequence(items: any[]) {
    return items.filter((item, index) => {
      const previous = index > 0 ? items[index - 1] : undefined;
      const next = index < items.length-1 ? items[index + 1] : undefined
      const gapFromPrevious = previous ? this.calcGapBetweenItems(previous, item) : GAP_IN_SEQUENCE + 1; 
      const gapFromNext = next ? this.calcGapBetweenItems(item, next) : GAP_IN_SEQUENCE + 1; 

      return gapFromPrevious < GAP_IN_SEQUENCE || gapFromNext < GAP_IN_SEQUENCE
    })
  }

  private calcGapBetweenItems(first, second) {
    const firstCreation = new Date(first._source.CreationDateTime);
    const secondCreation = new Date(second._source.CreationDateTime);

    // calculate the time difference in minutes between the to dates.
    return (secondCreation.getTime() - firstCreation.getTime()) / MILLISECONDS_IN_MINUTE
  }

  private groupByMonth(items: any[]) {
    let result = {};
    items.map(item => {
      const creationDate = new Date(item._source.CreationDateTime)
      const mapKey = this.getObjectPropName(creationDate);
      // if the key doesn't exist, need to initialize the counter.
      if(!(mapKey in result)) {
        result[mapKey] = 1;
      }
      else {
        result[mapKey]++
      }
    })
    return result;
  }

  private getObjectPropName(date: Date) {
    return `${date.getMonth() + 1}/${date.getFullYear()}` 
  }

  // calculate dates range of previous month logs
  private getFirstLogsDate(auditLogData) {
    let returnedObject: { Range: string, NumberOfDays: number } = { Range: '', NumberOfDays: 0 };
    const today= new Date();
    const dateMonthAgo = new Date(today.getFullYear(), today.getMonth(), 0); // get the last day of previous month

    const logsStartDate = new Date(auditLogData.resultObject.hits.hits[0]._source.CreationDateTime); // get the first log date
    if(logsStartDate.getMonth() === dateMonthAgo.getMonth()) { // if there's data in the last month
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
