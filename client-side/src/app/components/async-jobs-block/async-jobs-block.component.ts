import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IPepGenericListDataSource } from "@pepperi-addons/ngx-composite-lib/generic-list";
import { AddonData } from '@pepperi-addons/papi-sdk';
import { AuditDataLogBlock } from '../audit-data-log-block/audit-data-log-block.service';
import { PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { AsyncJobAuditLogDialogComponent } from './async-job-audit-log-dialog/async-job-audit-log-dialog.component';
@Component({
  selector: 'addon-async-jobs-block',
  templateUrl: './async-jobs-block.component.html',
  styleUrls: ['./async-jobs-block.component.scss']
})
export class AsyncJobsBlockComponent implements OnInit {
  dataSource: IPepGenericListDataSource;
  executionItems: AddonData;
  // Host Object, where query.
  @Input() hostObject: {
    where: string;
  };

  constructor(public translate: TranslateService, private addonService: AuditDataLogBlock, public dialogService: PepDialogService,) { }

  ngOnInit(): void {
    this.reload();
  }

  /**
   * Repopulate the data source
   */
  reload(): void {
    this.dataSource = this.getDataSource();
  }

  /**
   * On Field click callback to open dialog to show audit log data
   * @param event 
   */
  onFieldClick(event): void {
    if (event.key === 'UUID') { // handle link for opening audit log in executions list
      const auditLog = this.executionItems.find((element) => { return element.UUID === event.id });
      this.dialogService.openDialog(AsyncJobAuditLogDialogComponent, auditLog);
    }
  }

  /**
   * this method return data source for generic list.
   */
  private getDataSource(): IPepGenericListDataSource {
    return {
      init: async (_) => {
        // get the job executions
        await this.mapExecutionsData();
        return Promise.resolve({
          dataView: this.getDataView(),
          items: this.executionItems,
          totalCount: this.executionItems.length

        });
      }
    } as IPepGenericListDataSource
  }

  /**
   * @private
   * This method returns data view object
  */
  private getDataView() {
    return {
      Context: {
        Name: '',
        Profile: { InternalID: 0 },
        ScreenSize: 'Landscape'
      },
      Type: 'Grid',
      Title: '',
      Fields: [
        {
          FieldID: 'UUID',
          Type: 'Link',
          Title: this.translate.instant('Execution UUID'),
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'Status',
          Type: 'TextBox',
          Title: this.translate.instant('Status'),
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'NumberOfTriesFraction',
          Type: 'TextBox',
          Title: this.translate.instant('Number Of Tries'),
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'StartTime',
          Type: 'DateAndTime',
          Title: this.translate.instant('Start Time'),
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'EndTime',
          Type: 'DateAndTime',
          Title: this.translate.instant('End Time'),
          Mandatory: false,
          ReadOnly: true
        }
      ],
      Columns: [
        {
          Width: 10
        },
        {
          Width: 5
        },
        {
          Width: 5
        },
        {
          Width: 10
        },
        {
          Width: 10
        }
      ],
      FrozenColumnsCount: 0,
      MinimumColumnWidth: 0
    }
  }

  /**
   * This method fetch the jobs and map them in a view model format
   */
  private async mapExecutionsData()  {
    const auditLogExecutions = await this.addonService.getAsyncJobs(this.hostObject.where);
    this.executionItems = auditLogExecutions.map(element => {
      element.Status = element.Status.Name;
      element.StartTime = element.AuditInfo.JobMessageData.StartDateTime.toLocaleString();
      element.EndTime = element.AuditInfo.JobMessageData.EndDateTime.toLocaleString();
      element.NumberOfTriesFraction = `${element.AuditInfo.JobMessageData.NumberOfTry}/${element.AuditInfo.JobMessageData.NumberOfTries}`;
      return element;
    });
  }

}
