import { Client } from "@pepperi-addons/debug-server/dist";
import { AUDIT_LOGS_WEEKS_RANGE } from "../entities";
import { BaseElasticSyncService } from "./base-elastic-sync.service";
import jwtDecode from "jwt-decode";

export abstract class BaseSyncAggregationService extends BaseElasticSyncService {
    distributorUUID: string;
    maintenanceWindow: number[] = [];
    
    constructor(client: Client, ownerID: string) {
        super(client, ownerID);
        this.distributorUUID = (<any>jwtDecode(client.OAuthAccessToken))["pepperi.distributoruuid"];
    }
    protected abstract getStatusAggregationQuery();

    protected abstract getSyncAggregationQuery(aggregationQuery, datesRange);

    // calculate dates range of previous month logs
    protected getLastMonthLogsDates() {
        const today= new Date();
        const dateMonthAgo = new Date(today.getFullYear(), today.getMonth(), 0); // get the last day of previous month
        
        const logsStartDate = new Date(today.setDate(today.getDate() - (AUDIT_LOGS_WEEKS_RANGE * 7))); // get AUDIT_LOGS_WEEKS_RANGE weeks ago date
        const firstLogsDay = logsStartDate.getMonth() === dateMonthAgo.getMonth() ? logsStartDate.getDate() : 1;

        return `${firstLogsDay}-${dateMonthAgo.getDate()}/${dateMonthAgo.getMonth() + 1}`; // return dates range in dd1-dd2/mm format
      } 


    timeZoneOffsetToString(timeZoneOffset: number): string | undefined {
        let timeZoneOffsetString: string | undefined = undefined;
     
        if (timeZoneOffset) {
            timeZoneOffsetString = this.toHoursAndMinutes(Math.abs(timeZoneOffset));
            timeZoneOffsetString = (timeZoneOffset >= 0) ? `+${timeZoneOffsetString}` : `-${timeZoneOffsetString}`;
        }
     
        return timeZoneOffsetString;
      }
     
      private toHoursAndMinutes(totalMinutes: number): string {
        const minutes = totalMinutes % 60;
        const hours = Math.floor(totalMinutes / 60);
     
        return `${this.padTo2Digits(hours)}:${this.padTo2Digits(minutes)}`;
      }

      private padTo2Digits(num: number): string {
        return num.toString().padStart(2, '0');
      }
}