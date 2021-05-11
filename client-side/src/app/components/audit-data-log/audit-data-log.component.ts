import { Component, destroyPlatform, Input, OnInit, ViewChild } from '@angular/core';
import { FIELD_TYPE, ObjectsDataRow, PepDataConvertorService, PepFieldData, PepRowData, PepWindowScrollingService, UIControl, X_ALIGNMENT_TYPE } from '@pepperi-addons/ngx-lib';
import { IPepMenuItemClickEvent, PepMenuItem } from '@pepperi-addons/ngx-lib/menu';
import { TranslateService } from '@ngx-translate/core';
import { DEFAULT_PAGE_SIZE, IPepListPagerChangeEvent, IPepListSortingChangeEvent, IPepListSortingOptionChangeEvent, PepListComponent, PepListPagerType, PepListViewType } from '@pepperi-addons/ngx-lib/list';
import { AddonService } from '../addon/addon.service';
import { Document, UpdatedField } from '../../../../../shared/models/document'
import moment from 'moment';
import { ActivatedRoute } from '@angular/router';
import { createSmartFilter, createSmartFilterField, PepSmartFilterOperatorType } from '@pepperi-addons/ngx-lib/smart-filters';

import {
  IPepSmartFilterField,
  IPepSmartFilterData,
  IPepSmartFilterFieldOption,
  PepSmartFilterOperators,
  PepSmartFilterType,
  PepSmartFilterBaseField

} from '@pepperi-addons/ngx-lib/smart-filters';
import { IPepSearchStateChangeEvent } from '@pepperi-addons/ngx-lib/search';
import { pepIconArrowRightAlt } from '@pepperi-addons/ngx-lib/icon';
import { disableDebugTools } from '@angular/platform-browser';
import QueryUtil from '../../../../../shared/utilities/query-util';
import { IPepFormFieldClickEvent } from '@pepperi-addons/ngx-lib/form';
@Component({
  selector: 'addon-audit-data-log',
  templateUrl: './audit-data-log.component.html',
  styleUrls: ['./audit-data-log.component.scss'],

})
export class AuditDataLogComponent implements OnInit {
  @ViewChild(PepListComponent) customConflictList: PepListComponent;
  @Input("options") selectedObjects: any;
  @Input() pagerType: PepListPagerType = 'pages';
  @Input() pageType = '';
  @Input() totalsRow = [];
  @Input() pageSize: number = DEFAULT_PAGE_SIZE;
  @Input() pageIndex = 0;
  @Input() scrollAnimationTime = 500;

  private _showItems = true;
  filtersStr: string;
  get showItems() {
    return this._showItems;
  }
  totalRows = -1;
  fields: Array<IPepSmartFilterField>;
  filters: Array<IPepSmartFilterData>;
  searchString = '';
  menuItems: Array<PepMenuItem>;
  selectedMenuItem: PepMenuItem;
  searchStringFields: string;
  viewType: PepListViewType = "table";
  users = [];
  addons = [];
  numberOfResults = '';
  docs: Document[] = [];

  constructor(public translate: TranslateService,
    private dataConvertorService: PepDataConvertorService,
    private addonService: AddonService,
    public routeParams: ActivatedRoute) {
    this.searchStringFields = 'ActionUUID,ObjectKey,UpdatedFields.FieldID,UpdatedFields.NewValue,UpdatedFields.OldValue';
    this.addonService.addonUUID = this.routeParams.snapshot.params['addon_uuid'];
  }

  ngAfterViewInit(): void {
  }

  private reloadList() {
    // this.addonService.audit_data_log_query(this.searchString, this.filtersStr, this.searchStringFields).then((docs) => {
    //   this.docs = docs;
    //   this.loadDataLogsList(docs);
    // });
    this.addonService.audit_data_log_query(this.searchString, this.filtersStr, this.searchStringFields).subscribe((docs) => {
      this.docs = docs;
      this.loadDataLogsList(docs);
    });
  }

  onPagerChange(event: IPepListPagerChangeEvent): void {
  }

  ngOnInit(): void {
    this.addonService.getUsers().then((users) => {
      this.users = users;
      this.addonService.getAddons().then((addons) => {
        this.addons = addons;
        this.addons.push({
          UUID: '00000000-0000-0000-0000-00000000c07e',
          Name: 'Nucleus'
        })
        this.loadSmartFilters();
        this.reloadList();
        this.loadMenuItems();
      });
    });
  }

  private loadSmartFilters(): void {
    const resources: IPepSmartFilterFieldOption[] = [];
    const actionstypesOptions: IPepSmartFilterFieldOption[] = [];
    const users: IPepSmartFilterFieldOption[] = [];
    const addons: IPepSmartFilterFieldOption[] = [];

    const distinctValues = 'Resource,ActionType,UserUUID,AddonUUID';
    this.addonService.audit_data_log_distinct_values(this.searchString, this.filtersStr, this.searchStringFields, distinctValues).subscribe(async (values) => {
      const resourceValues = values.find(x => x.APIName === 'Resource');
      const actionTypeValues = values.find(x => x.APIName === 'ActionType');
      const userUalues = values.find(x => x.APIName === 'UserUUID');
      const addonValues = values.find(x => x.APIName === 'AddonUUID');

      resourceValues.Values.forEach(resourceValue => {
        resources.push({ value: resourceValue.key, count: resourceValue.doc_count });
      });
      actionTypeValues.Values.forEach(actionTypeValue => {
        actionstypesOptions.push({ value: actionTypeValue.key, count: actionTypeValue.doc_count });
      });

      addonValues.Values.forEach(addon => {
        const addonObject = this.addons.find(a => a.UUID === addon.key);
        addons.push({ value: addonObject.Name, count: addon.doc_count });
      });
      for (let user of userUalues.Values) {
        let userDetails = this.users.find(u => u.UUID === user.key);
        let email = '';
        if (userDetails) {
          email = userDetails.Email;
        }
        else {
          // support admin user doesnt returned in 'users' api
          const userDetails = await this.addonService.getUserBuUUID(user.key);
          if (userDetails) {
            this.users.push({ UUID: userDetails.UUID, Email: 'Pepperi Admin', InternalID: userDetails.InternalID });
          }
          email = 'Pepperi Admin'
        }
        users.push({ value: email, count: user.doc_count });
      };
      const operators: PepSmartFilterOperatorType[] = ['before', 'after', 'today', 'thisWeek', 'thisMonth', 'dateRange', 'on', 'inTheLast'];
      this.fields = [
        createSmartFilterField({ id: 'AddonUUID', name: 'Addon', options: addons }, 'multi-select'),
        createSmartFilterField({ id: 'Resource', name: 'Resource', options: resources }, 'multi-select'),
        createSmartFilterField({ id: 'UserUUID', name: 'User', options: users }, 'multi-select'),
        createSmartFilterField({ id: 'ActionType', name: 'Type', options: actionstypesOptions }, 'multi-select'),
        createSmartFilterField({ id: 'ActionDateTime', name: 'Action Date Time', operators }, 'date-time'),
      ];
    })
  }

  notifyValueChanged(event) {
    debugger;
  }
  selectedRowsChanged(selectedRowsCount: number) {
    debugger;
  }

  sortingChange(sortingChangeEvent: IPepListSortingChangeEvent) {
    switch (sortingChangeEvent.sortBy) {
      case 'ActionDateTime':
        this.docs = this.docs.sort((a, b) =>
          sortingChangeEvent.isAsc ?
            new Date(a.ObjectModificationDateTime).getTime() - new Date(b.ObjectModificationDateTime).getTime() :
            new Date(b.ObjectModificationDateTime).getTime() - new Date(a.ObjectModificationDateTime).getTime()
        );
        break;
      case 'Operation':
        this.docs.sort((a, b) =>
          sortingChangeEvent.isAsc ?
            (a.ActionType > b.ActionType ? -1 : 1) :
            (b.ActionType > a.ActionType ? -1 : 1)
        );
        break;
      case 'Type':
        this.docs.sort((a, b) =>
          sortingChangeEvent.isAsc ?
            (a.Resource > b.Resource ? -1 : 1) :
            (b.Resource > a.Resource ? -1 : 1)
        );
        break;
      case 'User':
        this.docs.sort((a, b) =>
          sortingChangeEvent.isAsc ?
            (a.UserEmail > b.UserEmail ? -1 : 1) :
            (b.UserEmail > a.UserEmail ? -1 : 1)
        );
        break;
      case 'ID':
        this.docs.sort((a, b) =>
          sortingChangeEvent.isAsc ?
            (a.ObjectKey > b.ObjectKey ? -1 : 1) :
            (b.ObjectKey > a.ObjectKey ? -1 : 1)
        );
        break;
    }

    console.log(`after sort by ${sortingChangeEvent.sortBy} - ascending ${sortingChangeEvent.isAsc}`, this.docs);

    this.loadDataLogsList(this.docs);

    debugger;
  }

  loadDataLogsList(docs) {
    const tableData = new Array<PepRowData>();
    docs.forEach((doc) => {
      const userKeys = ["ID", "Type", "ObjectKey", "Resource", "UpdatedFields", "User", "ActionDateTime"];
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
      rows,
      this.viewType,
      "",
      false
    );

  }

  convertConflictToPepRowData(doc: Document, customKeys) {
    const row = new PepRowData();
    row.Fields = [];
    customKeys.forEach((key) =>
      row.Fields.push(this.initDataRowFieldOfConflicts(doc, key))
    );
    return row;
  }

  capitalize(s: string) {
    return s[0].toUpperCase() + s.slice(1);
  }

  uncapitalized(s: string) {
    return s[0].toLowerCase() + s.slice(1);
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
    const href = window.location.origin + '/settings/' + this.addonService.addonUUID + '/logs';

    switch (key) {
      case "ID":
        dataRowField.ColumnWidth = 3;
        const operationStr = `<a href="${href}?action_uuid=${document.ActionUUID}&action_date_time=${document.ObjectModificationDateTime}"
        target="_blank" rel="noopener noreferrer"><span class="short-span">${document.ActionUUID}</span></a>`
        dataRowField.FormattedValue = dataRowField.Value = operationStr;
        break;
      case "Type":
        dataRowField.ColumnWidth = 3;
        const actionType = this.capitalize(document.ActionType);
        dataRowField.FormattedValue = dataRowField.Value = actionType;
        break;
      case "ObjectKey":
        dataRowField.ColumnWidth = 5;
        dataRowField.FormattedValue = dataRowField.Value = document.ObjectKey;
        break;
      case "Resource":
        dataRowField.ColumnWidth = 7;
        let addon = this.addons.find(x => x.UUID === document.AddonUUID);
        const typeStr = `${addon.Name}: ${document.Resource}`
        const resourceStr = `<a href="${href}?addon_uuid=${addon.UUID}&action_date_time=${document.ObjectModificationDateTime}"
        target="_blank" rel="noopener noreferrer"><span class="short-span">${typeStr}</span></a>`
        dataRowField.FormattedValue = dataRowField.Value = resourceStr;

        break;
      case "UpdatedFields":
        const updateFieldStr = this.buildUpdatedFieldsTable(document.UpdatedFields);
        dataRowField.FormattedValue = dataRowField.Value = updateFieldStr;
        break;
      case "User":
        dataRowField.ColumnWidth = 5;
        const user = this.users.find(u => u.UUID === document.UserUUID);
        const userStr = `${user?.Email} (${user?.InternalID})`;
        dataRowField.FormattedValue = dataRowField.Value = userStr;
        document.UserEmail = user?.Email;
        break;

      case "ActionDateTime":
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
    if (updatedFields) {
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

  onFiltersChange(filtersData: IPepSmartFilterData[]) {
    let filters = [];
    for (const filter of filtersData) {
      switch (filter.operator.componentType[0]) {
        case 'multi-select':
          let values = [];
          filter.value.first.forEach(value => {
            values.push(value)
          });
          let valuesString = values.join(',');
          if (filter.fieldId === 'UserUUID') {
            let usersUUIDs = [];
            values.forEach((value) => {
              const user = this.users.find(u => u.Email === value);
              usersUUIDs.push(user.UUID);
            })
            valuesString = usersUUIDs.join(',');
          }
          if (filter.fieldId === 'AddonUUID') {
            let addonUUIDs = [];
            values.forEach((value) => {
              const addon = this.addons.find(u => u.Name === value);
              addonUUIDs.push(addon.UUID);
            })
            valuesString = addonUUIDs.join(',');
          }
          filters.push(`${filter.fieldId}.keyword=${valuesString}`);
          break;
        case 'date':
          const whereClause = QueryUtil.buildWhereClauseByDateField(filter);
          filters.push(whereClause);
          break;
      }
    }
    this.filtersStr = filters.join(' and ');
    this.addonService.audit_data_log_query(this.searchString, this.filtersStr, this.searchStringFields).subscribe((docs) => {
      this.loadDataLogsList(docs);
      this.loadSmartFilters();

    });
    debugger;
    console.log(JSON.stringify(filtersData))
  }

  onSearchStateChanged(searchStateChangeEvent: IPepSearchStateChangeEvent) {
    // debugger;
  }

  onSearchAutocompleteChanged(value) {
    console.log(value);
    // debugger;
  }

  onSearchChanged(search: any) {
    this.searchString = search.value;
    this.addonService.audit_data_log_query(this.searchString, this.filtersStr, this.searchStringFields).subscribe((docs) => {
      this.loadDataLogsList(docs);
      this.loadSmartFilters();
    })
    console.log(search);
    debugger;
  }
  onCustomizeFieldClick(fieldClickEvent: IPepFormFieldClickEvent) {
    debugger;
  }

  onMenuItemClicked(action: IPepMenuItemClickEvent): void {
    alert(action.source.key);
  }

  private loadMenuItems(): void {
    this.menuItems = this.getMenuItems();
    this.selectedMenuItem = this.menuItems[0];
  }

  getMenuItems(withChildren = true, index = 0): Array<PepMenuItem> {
    let menuItems: Array<PepMenuItem>;
    index++;
    menuItems = [
      { key: `${index}`, text: 'Export to Excel' }
    ];

    return menuItems;
  }

}



