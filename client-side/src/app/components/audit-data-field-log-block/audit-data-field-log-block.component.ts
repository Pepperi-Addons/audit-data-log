import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { PropertyAuditLogHost } from '../../../../../shared/models/audit-logs';
import { AuditDataLogBlock } from '../audit-data-log-block/audit-data-log-block.service';
import { TranslateService } from '@ngx-translate/core';
import { FIELD_TYPE, PepDataConvertorService, PepFieldData, PepRowData, X_ALIGNMENT_TYPE } from '@pepperi-addons/ngx-lib';
import { PepListComponent, PepListViewType } from '@pepperi-addons/ngx-lib/list';
import { UpdatedField, Document } from '../../../../../shared/models/document';

@Component({
  selector: 'addon-audit-data-field-log-block',
  templateUrl: './audit-data-field-log-block.component.html',
  styleUrls: ['./audit-data-field-log-block.component.scss']
})
export class AuditDataFieldLogBlockComponent implements OnInit {
  @Input() hostObject: PropertyAuditLogHost;
  viewType: PepListViewType = "table";
  users = {};

  @ViewChild(PepListComponent) customConflictList: PepListComponent;

  constructor(
    private auditDataLogService: AuditDataLogBlock,
    public translate: TranslateService,
    private dataConvertorService: PepDataConvertorService

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
    this.loadDataLogsList(resp.AuditLogs)
  }

  /**
   * Method to map the data and initialize a table view
   * @param docs 
   * @private
   */
  private loadDataLogsList(docs) {
    const tableData = new Array<PepRowData>();
    docs.forEach((doc) => {
      const userKeys = ["ID", "CreationDateTime", "UpdatedFields", "Email", "User", "ExternalID", "InternalID", "ActionUUID"];
      tableData.push(
        this.convertToPepRowData(doc, userKeys)
      );
    });
    let rows = [];
    let uiControl;
    if (tableData.length > 0) {
      uiControl = this.dataConvertorService.getUiControl(
        tableData[0]
      );
      rows = this.dataConvertorService.convertListData(
        tableData
      );
    }

    this.customConflictList.initListData(
      uiControl,
      rows.length,
      rows
    );

  }


  /**
   * Method to convert normal data row to list row
   * @param doc 
   * @param customKeys 
   * @returns PepRowData
   * @private
   */
  private convertToPepRowData(doc: Document, customKeys): PepRowData {
    const row = new PepRowData();
    row.Fields = [];
    customKeys.forEach((key) =>
      row.Fields.push(this.initDataRowField(doc, key))
    );
    return row;
  }

  /**
   * Method to initialise data and config for each row
   * @param document 
   * @param key 
   * @returns PepFieldData
   * @private
   */
  private initDataRowField(document: Document, key: any): PepFieldData {
    const dataRowField: PepFieldData = {
      ApiName: key,
      Title: this.translate.instant(key),
      XAlignment: X_ALIGNMENT_TYPE.Left,
      FormattedValue: document[key] ? document[key] : "",
      Value: document[key] ? document[key] : "",
      ColumnWidth: 10,
      OptionalValues: [],
      FieldType: FIELD_TYPE.RichTextHTML,
      Enabled: false
    };

    const user = this.users[document.UserUUID];
    switch (key) {
      case "ID":
        dataRowField.Title = this.translate.instant('Client Application Type');
        dataRowField.FormattedValue = dataRowField.Value = '';
        break;
      case "CreationDateTime":
        dataRowField.Title = this.translate.instant('Creation Date(time in UTC)');
        break;

      case "UpdatedFields":
        const updateFieldStr = this.buildUpdatedFieldsTable(document.UpdatedFields);
        dataRowField.FormattedValue = dataRowField.Value = updateFieldStr;
        dataRowField.Title = `${this.hostObject.FieldID} ${this.translate.instant('After')}`;
        break;
      case "Email":
        dataRowField.FormattedValue = dataRowField.Value = user.Email;
        dataRowField.Title = this.translate.instant('Email');
        break;
      case 'User':
        dataRowField.Title = this.translate.instant('Name') ;
        dataRowField.FormattedValue = dataRowField.Value = `${user.FirstName} ${user.LastName}`
        break;

      case "ExternalID":
        dataRowField.Title = this.translate.instant('User External ID');
        dataRowField.ColumnWidth = 5;
        dataRowField.FormattedValue = dataRowField.Value = user.ExternalID;
        break;
      case "InternalID":
        dataRowField.Title = this.translate.instant('User ID');
        dataRowField.FormattedValue = dataRowField.Value = user.InternalID;
        break;
      default:
        dataRowField.ColumnWidth = 5;
        dataRowField.FormattedValue = document[key]
          ? document[key].toString()
          : "";
        break;
    }
    return dataRowField;
  }


  /**
   * Method to format the updated value
   * @param updatedFields 
   * @returns string
   * @private
   */
  private buildUpdatedFieldsTable(updatedFields: UpdatedField[]): string {
    let str = '';
    if (updatedFields && updatedFields.length > 0) {
      str += '<div class="updated-fields">'
      for (const updateField of updatedFields) {
        str +=
          `<div class="updated-field"> 
            <div class="updated-field__item">
              <p><i>${updateField.NewValue}</i></p>
            </div>
          </div>`
      }
      str += '</div>'
    }
    return str;
  }

}
