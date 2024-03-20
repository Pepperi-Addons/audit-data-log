import { Client } from "@pepperi-addons/debug-server/dist";
import { BaseSyncAggregationService } from "./base-sync-aggregation.service";
import { HOURS_IN_DAY, MINUTES_IN_HOUR, MAINTENANCE_WINDOW_IN_HOURS, RETRY_OFF_TIME_IN_MINUTES, KMS_KEY, DAY_TO_NUMBER } from "../entities";

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

    getSyncAggregationQuery(auditLogDateRange, globalMaintenanceWindow: { days: string[], time: string, duration: number }) {
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
              this.getGlobalMaintenanceWindowScript(globalMaintenanceWindow),
              auditLogDateRange
            ]
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

  // exclude syncs that were created in the global maintenance window
  private getGlobalMaintenanceWindowScript(globalMaintenanceWindow: { days: string[], time: string, duration: number }) {
    let scriptReturnedString = '';

    const startHour = parseInt(globalMaintenanceWindow.time.split(':')[0]);
    const endHour = (startHour + globalMaintenanceWindow.duration) % 24;
    const minutes = parseInt(globalMaintenanceWindow.time.split(':')[1]);
    
    if(startHour > endHour) { // means we are at the next day
      scriptReturnedString = `(${globalMaintenanceWindow.days.map(day => { return `(targetDay==${DAY_TO_NUMBER[day]} && targetTime>=startTime) || (targetDay==${(DAY_TO_NUMBER[day] + 1) % 7} && targetTime<=endTime)`}).join(' || ')})`;
    } else {
      scriptReturnedString = `(${globalMaintenanceWindow.days.map(day => { return `targetDay==${DAY_TO_NUMBER[day]}`}).join(' || ')}) && targetTime>=startTime && targetTime<=endTime`;
    }

    return {
      bool: {
          must_not: {
              script: {
                  script: { // excluding global maintenance window hours
                      source: `
                          def targetDay = doc['CreationDateTime'].value.dayOfWeek;
                          def targetHour = doc['CreationDateTime'].value.hourOfDay;
                          def targetMinute = doc['CreationDateTime'].value.minuteOfHour;

                          def targetTime = targetHour * 60 + targetMinute;
                          def startTime = ${startHour} * 60 + ${minutes};
                          def endTime = ${endHour} * 60 + ${minutes};
                          
                          return ${scriptReturnedString};
                      `
                  }
              }
          }
      }
    }
  }
  
  private async getGlobalMaintenanceWindow(): Promise<{days: string[], time: string, duration: number}> {
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
