import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IPepGenericListDataSource } from "@pepperi-addons/ngx-composite-lib/generic-list";
import { AddonData } from '@pepperi-addons/papi-sdk';
import { AuditDataLogBlock } from '../audit-data-log-block/audit-data-log-block.service';
import { CodeJobExecutionsHostEvent } from '../../../../../shared/models/audit-log';
@Component({
  selector: 'addon-code-job-executions-block',
  templateUrl: './code-job-executions-block.component.html',
  styleUrls: ['./code-job-executions-block.component.scss']
})
export class CodeJobExecutionsBlockComponent implements OnInit {
  dataSource: IPepGenericListDataSource;
  executionItems: AddonData;
  @Input() hostObject: {
    key: string;
  };

  @Output() hostEvents: EventEmitter<
    CodeJobExecutionsHostEvent
  > = new EventEmitter<CodeJobExecutionsHostEvent>();
  constructor(public translate: TranslateService, private addonService: AuditDataLogBlock) { }

  ngOnInit(): void {
    this.reload();
  }

  reload() {
    this.dataSource = this.getDataSource();
  }

  onFieldClick(event) {
    if (event.key === 'UUID') { // handle link for opening audit log in executions list
      const auditLog = this.executionItems.find((element) => { return element.UUID === event.id });
      this.hostEvents.emit({
        name: 'onMenuItemClick',
        action: 'show-audit-log',
        data: {
          auditLog: auditLog
        }
      })
    }
  }

  private getDataSource(): IPepGenericListDataSource {
    return {
      init: async (parameters) => {

        this.mapExecutionsData();

        return Promise.resolve({
          dataView: this.getDataView(),
          items: this.executionItems,
          totalCount: this.executionItems.length

        });
      }
    } as IPepGenericListDataSource
  }

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

  private async mapExecutionsData() {
    const auditLogExecutions = await this.addonService.getAllExecutionLogs(this.hostObject.key);
    this.executionItems = auditLogExecutions.map(element => {
      element.Status = element.Status.Name;
      element.StartTime = element.AuditInfo.JobMessageData.StartDateTime.toLocaleString();
      element.EndTime = element.AuditInfo.JobMessageData.EndDateTime.toLocaleString();
      element.NumberOfTriesFraction = `${element.AuditInfo.JobMessageData.NumberOfTry}/${element.AuditInfo.JobMessageData.NumberOfTries}`;
      return element;
    });
  }

}
