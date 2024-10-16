import { Component, Input, OnInit } from '@angular/core';
import { PropertyAuditLogHost } from '../../../../../shared/models/audit-logs';
import { AuditDataLogBlock } from '../audit-data-log-block/audit-data-log-block.service';
import { TranslateService } from '@ngx-translate/core';
import { IPepGenericListDataSource } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { AddonData } from '@pepperi-addons/papi-sdk';

@Component({
  selector: 'addon-audit-data-field-log-block',
  templateUrl: './audit-data-field-log-block.component.html',
  styleUrls: ['./audit-data-field-log-block.component.scss']
})
export class AuditDataFieldLogBlockComponent implements OnInit {
  @Input() hostObject: PropertyAuditLogHost;
  users = {};
  auditDataLogs: AddonData = [];
  dataSource: IPepGenericListDataSource;

  constructor(
    private auditDataLogService: AuditDataLogBlock,
    public translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.reload();
  }

  /**
   * Method to fetch data and load the list
   */
  public async reload() {
    const whereQuery = `ObjectKey.keyword=${this.hostObject.ObjectKey} and Resource.keyword=${this.hostObject.Resource} and AddonUUID.keyword=${this.hostObject.AddonUUID}`;
    const resp = await this.auditDataLogService.field_id_audit_data_log_query(whereQuery, this.hostObject.FieldID);
    this.users = resp.Users;
    this.dataSource = this.getDataSource(resp.AuditLogs)
  }

  /**
   * this method return data source for generic list.
   */
  private getDataSource(docs): IPepGenericListDataSource {
    return {
      init: async (_) => {
        this.mapExecutionsData(docs);
        return Promise.resolve({
          dataView: this.getDataView(),
          items: this.auditDataLogs,
          totalCount: this.auditDataLogs.length

        });
      }
    } as IPepGenericListDataSource
  }

  private mapExecutionsData(docs) {
    this.auditDataLogs = docs.map(doc => {
      const user = this.users[doc.UserUUID];
      return {
        CreationDateTime: doc.CreationDateTime,
        Email: user.Email,
        User: `${user.FirstName} ${user.LastName}`,
        UpdatedFields: doc?.UpdatedFields?.[0].NewValue.toString(),
        ExternalID: user.ExternalID,
        InternalID: user.InternalID,
        ActionUUID: doc.ActionUUID
      }
    });
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
          FieldID: 'CreationDateTime',
          Type: 'TextBox',
          Title: this.translate.instant('Creation Date(time in UTC)'),
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'Email',
          Type: 'TextBox',
          Title: this.translate.instant('Email'),
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'User',
          Type: 'TextBox',
          Title: this.translate.instant('Name'),
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'UpdatedFields',
          Type: 'TextBox',
          Title: `${this.translate.instant(this.hostObject.FieldID)} ${this.translate.instant('After')}`,
          Mandatory: false,
          ReadOnly: true
        },

        {
          FieldID: 'ExternalID',
          Type: 'TextBox',
          Title: this.translate.instant('User External ID'),
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'InternalID',
          Type: 'TextBox',
          Title: this.translate.instant('User ID'),
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'ActionUUID',
          Type: 'TextBox',
          Title: this.translate.instant('ActionUUID'),
          Mandatory: false,
          ReadOnly: true
        }
      ],
      Columns: [
        {
          Width: 10
        },
        {
          Width: 10
        },
        {
          Width: 10
        },
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
          Width: 12
        }
      ],
      FrozenColumnsCount: 0,
      MinimumColumnWidth: 0
    }
  }

}
