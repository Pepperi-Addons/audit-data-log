import {PepRowData, PepFieldData, X_ALIGNMENT_TYPE, FIELD_TYPE, PepDataConvertorService } from '@pepperi-addons/ngx-lib';
import { TranslateService } from '@ngx-translate/core';
import { AuditDataLogBlock } from './audit-data-log-block.service';
import { Document, UpdatedField } from '../../../../../shared/models/document'
import { NIL as NIL_UUID } from 'uuid';
import { pepIconArrowRightAlt } from '@pepperi-addons/ngx-lib/icon';
import { PepListComponent, PepListViewType } from '@pepperi-addons/ngx-lib/list';
import { EventEmitter, Input, Output, ViewChild } from '@angular/core';

import {
  Component,
  OnInit,
} from "@angular/core";

@Component({
  selector: 'audit-data-log-block',
  templateUrl: './audit-data-log-block.component.html',
  styleUrls: ['./audit-data-log-block.component.scss']
})
export class AuditDataLogBlockComponent implements OnInit {
  @ViewChild(PepListComponent) customConflictList: PepListComponent;
  //@Input() hostObject: any;
  @Input() AddonUUID!: string;
  @Input() ObjectKey!: string;
  @Input() Resource!: string;

  private _hostObject: any; 
  @Input() 
  set hostObject(value: any) {
      this._hostObject = value;

      if (value) {
          this.AddonUUID = value['AddonUUID'];
          this.ObjectKey = value['ObjectKey'];
          this.Resource = value['Resource'];
      }
  }

  @Output() hostEvents: EventEmitter<any> = new EventEmitter();

  addon;
  users = [];
  addons = [];
  docs: Document[] = [];
  viewType: PepListViewType = "table";


  constructor(
    private translate: TranslateService,
    private addonService: AuditDataLogBlock,
    private dataConvertorService: PepDataConvertorService
  ) {

  }

  async ngOnInit() {
    this.reloadList();
    
  }

  private reloadList() {
    const whereQuery = `AddonUUID.keyword=${this.AddonUUID} and ObjectKey.keyword=${this.ObjectKey} and Resource.keyword=${this.Resource}`
    this.addonService.audit_data_log_query(null, whereQuery, null).subscribe((docs) => {
      this.docs = docs;
      this.loadDataLogsList(docs);
    });
  }

  capitalize(s: string) {
    return s[0].toUpperCase() + s.slice(1);
  }

  loadDataLogsList(docs) {
    const tableData = new Array<PepRowData>();
    docs.forEach((doc) => {
      const userKeys = ["ID", "Type", "UpdatedFields", "User", "ActionDateTime"];
      tableData.push(
        this.convertConflictToPepRowData(doc, userKeys)
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

  convertConflictToPepRowData(doc: Document, customKeys) {
    const row = new PepRowData();
    row.Fields = [];
    customKeys.forEach((key) =>
      row.Fields.push(this.initDataRowFieldOfConflicts(doc, key))
    );
    console.log(row);
    return row;
  }

  

  initDataRowFieldOfConflicts(document: Document, key: any): PepFieldData {
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
    const user = this.users.find(u => u.UUID === document.UserUUID);
    const email = user ? user.Email : 'Pepperi Admin';
    const href = 'settingsSectionName/' + this.addonService.addonUUID + '/logs';
    //target="_blank" rel="noopener noreferrer"
    switch (key) {
      case "ID":
        dataRowField.ColumnWidth = 3;
        const actionUuid = document.ActionUUID === NIL_UUID ? '' : document.ActionUUID;
        const actionUuidHtml = `<span class="custom-span">${actionUuid}</span>`;
        const operationStr = `<a href="${href}?action_uuid=${document.ActionUUID}&action_date_time=${document.CreationDateTime}&user=${email}">${actionUuidHtml}</span></a>`
        dataRowField.FormattedValue = dataRowField.Value = this.addonService.isSupportAdminUser ? operationStr : actionUuidHtml;
        dataRowField.Title = 'ID';
        break;
      case "Type":
        dataRowField.ColumnWidth = 3;
        const actionType = this.capitalize(document.ActionType);
        dataRowField.FormattedValue = dataRowField.Value = actionType;
        break;
      case "UpdatedFields":
        dataRowField.Title = 'Changes';
        const updateFieldStr = this.buildUpdatedFieldsTable(document.UpdatedFields);
        dataRowField.FormattedValue = dataRowField.Value = updateFieldStr;
        break;
      case "User":
        dataRowField.ColumnWidth = 5;
        const userEmail = user?.Email ? user.Email : 'Pepperi Admin'
        let userStr = `${userEmail}`;
        if (user?.InternalID) {
          userStr += ` (${user?.InternalID})`
        }
        dataRowField.FormattedValue = dataRowField.Value = userStr;
        document.UserEmail = user?.Email;
        break;
      case "ActionDateTime":
        dataRowField.Title = 'Date & Time';
        dataRowField.ColumnWidth = 5;
        dataRowField.FormattedValue = dataRowField.Value = new Date(document.ObjectModificationDateTime).toLocaleString();
        break;

      default:
        dataRowField.FormattedValue = document[key]
          ? document[key].toString()
          : "";
        break;
    }
    return dataRowField;
  }

  private buildUpdatedFieldsTable(updatedFields: UpdatedField[]): string {
    let str = '';
    if (updatedFields && updatedFields.length > 0) {
      str += '<div class="updated-fields">'
      for (const updateField of updatedFields) {
        str +=
          `<div class="updated-field"> 
            <p><b>${updateField.FieldID}</b></p>
            <div class="updated-field__item">
              <p><i>${updateField.OldValue}</i></p>
              <svg>${pepIconArrowRightAlt.data}</svg>
              <p><i>${updateField.NewValue}</i></p>
            </div>
          </div>`
      }
      str += '</div>'
    }
    return str;
  }


}
