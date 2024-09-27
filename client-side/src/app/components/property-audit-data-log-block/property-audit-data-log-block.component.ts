import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PropertyAuditLogHost, PropertyAuditLogList } from '../../../../../shared/models/audit-logs';
import { AuditDataLogBlock } from '../audit-data-log-block/audit-data-log-block.service';
import { TranslateService } from '@ngx-translate/core';
import { IPepGenericListDataSource } from "@pepperi-addons/ngx-composite-lib/generic-list";

@Component({
  selector: 'addon-property-audit-data-log-block',
  templateUrl: './property-audit-data-log-block.component.html',
  styleUrls: ['./property-audit-data-log-block.component.scss']
})
export class PropertyAuditDataLogBlockComponent implements OnInit {
  items: Array<PropertyAuditLogList> = [];
  listDataSource: IPepGenericListDataSource;
  @Input() hostObject: PropertyAuditLogHost;
  @Output() hostEvents: EventEmitter<any> = new EventEmitter<any>();
  tableViewType = 'compact';
  constructor(
    private auditDataLogService: AuditDataLogBlock,
    public translate: TranslateService,
  ) { }

  ngOnInit(): void {
    this.reload();
  }

  public async reload() {
    const whereQuery = `ObjectKey.keyword=${this.hostObject.objectKey} and ObjectModificationDateTime>=${this.hostObject.objectModificationStartTime} and ObjectModificationDateTime<=${this.hostObject.objectModificationEndTime}`;
    const resp = await this.auditDataLogService.property_audit_data_log_query(whereQuery, this.hostObject.property);
    this.mapDataItems(resp);
    this.listDataSource = this.getDataSource();
  }

  protected handleClose() {
    this.hostEvents.emit({
      action: 'close',
      data: {}
    });
  }

  private mapDataItems(docs) {
    this.items = docs['AuditLogs'].map(row => {
      const user = docs['Users'][row['UserUUID']];
      return {
        'ClientApplicationType': '',
        'CreationDateTime': row['CreationDateTime'],
        'ObjectKey': row['ObjectKey'],
        'UpdatedFields': JSON.parse(row['UpdatedFields'][0].NewValue)[0],
        'Email': user?.Email || '',
        'User': `${user['FirstName']} ${user['LastName']}`,
        'ExternalID': user?.['ExternalID'] || '',
        'InternalID': user?.['InternalID'] || '',
        'ActionUUID': row['ActionUUID'],

      }
    });
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
          FieldID: 'ClientApplicationType',
          Type: 'TextBox',
          Title: 'Client Application Type',
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'CreationDateTime',
          Type: 'TextBox',
          Title: 'Creation Date(time in UTC)',
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'ObjectKey',
          Type: 'TextBox',
          Title: 'Object ID',
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'UpdatedFields',
          Type: 'TextBox',
          Title: `${this.hostObject.property} After`,
          Mandatory: false,
          ReadOnly: true

        },
        {
          FieldID: 'Email',
          Type: 'TextBox',
          Title: 'Email',
          Mandatory: false,
          ReadOnly: true

        },
        {
          FieldID: 'ExternalID',
          Type: 'TextBox',
          Title: 'User External ID',
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'User',
          Type: 'TextBox',
          Title: 'Name',
          Mandatory: false,
          ReadOnly: true
        },
        {
          FieldID: 'InternalID',
          Type: 'TextBox',
          Title: 'User ID',
          Mandatory: false,
          ReadOnly: true
        }
      ],
      Columns: [
        {
          width: 5
        },
        {
          width: 25
        },
        {
          width: 10
        },
        {
          width: 15
        },
        {
          width: 10
        },
        {
          width: 10
        },
        {
          width: 15
        },
        {
          width: 10
        }
      ],
      FrozenColumnsCount: 0,
      MinimumColumnWidth: 10
    };
  }

  private getDataSource() {
    return {
      init: async () => {
        return {
          dataView: this.getDataView(),
          items: this.items,
          totalCount: this.items.length
        }
      }
    } as IPepGenericListDataSource;
  }


}
