import { Client } from "@pepperi-addons/debug-server/dist";
import { BaseSyncAggregationService } from "./base-sync-aggregation.service";
import { HOURS_IN_DAY, MINUTES_IN_HOUR, RETRY_OFF_TIME_IN_MINUTES, KMS_KEY, AUDIT_LOGS_WEEKS_RANGE } from "../entities";
import parser from 'cron-parser';

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
    
    fixElasticResultObject(auditLogData, period) {
      let res = {};
      const today = new Date();
      const lastMonthKey = this.getObjectPropName(new Date(new Date().setMonth(today.getMonth()-1)));
      const currentMonthKey = this.getObjectPropName(today);
      const items = this.removeNotInSequence(auditLogData.resultObject.hits.hits)
      const months = this.groupByMonth(items);
      res[lastMonthKey] = this.calculateUpTime(months[lastMonthKey] || 0, period);
      res[currentMonthKey] = this.calculateUpTime(months[currentMonthKey] || 0, today.getDate());
      return res;
    }

    // The value is the number of sync monitor jobs runs that failed, multiply by 5 divide by (1440(=minutesInADay) * period(number of days in the month)).
    // (since each retry means 5 minutes without work.)
    private calculateUpTime(failureCount: number, period: number) {
        const calculatedFailedSyncs = ((1 - ((failureCount * RETRY_OFF_TIME_IN_MINUTES) / (MINUTES_IN_HOUR * HOURS_IN_DAY * period))) * 100).toFixed(2);
        return `${calculatedFailedSyncs}%`; // update each month uptime sync value
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
  
        const auditLogData = await this.getElasticData(this.getSyncAggregationQuery(monthlyDatesRange, globalMaintenanceWindow));
        const lastMonthDates = this.getLastMonthLogsDates()
  
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
            "must_not": this.generateExcludedDateTime(globalMaintenanceWindow)
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

  // get all global maintenance occurrences in the last AUDIT_LOGS_WEEKS_RANGE weeks, and add the range to the must_not array to exclude them from the logs
  private generateExcludedDateTime(globalMaintenanceWindow: { Expression: string, Duration: number }[]): any[] {
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

    return mustNotArray;
  }
  
  // get global maintenance window from KMS
  private async getGlobalMaintenanceWindow(): Promise<{ Expression: string, Duration: number }[]> {
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
