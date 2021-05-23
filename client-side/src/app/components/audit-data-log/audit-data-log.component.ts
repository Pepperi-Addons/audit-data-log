import { Component, destroyPlatform, Input, OnInit, ViewChild } from '@angular/core';
import { FIELD_TYPE, ObjectsDataRow, PepDataConvertorService, PepFieldData, PepRowData, PepWindowScrollingService, UIControl, X_ALIGNMENT_TYPE } from '@pepperi-addons/ngx-lib';
import { IPepMenuItemClickEvent, PepMenuItem } from '@pepperi-addons/ngx-lib/menu';
import { TranslateService } from '@ngx-translate/core';
import { DEFAULT_PAGE_SIZE, IPepListPagerChangeEvent, IPepListSortingChangeEvent, IPepListSortingOptionChangeEvent, PepListComponent, PepListPagerType, PepListViewType } from '@pepperi-addons/ngx-lib/list';
import { AddonService } from '../addon/addon.service';
import { Document, UpdatedField } from '../../../../../shared/models/document'
import moment from 'moment';
import { ActivatedRoute, Router } from '@angular/router';
import { createSmartFilter, createSmartFilterField, PepSmartFilterOperatorType } from '@pepperi-addons/ngx-lib/smart-filters';
import { Location } from '@angular/common';
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
import { data } from 'jquery';
import { NIL as NIL_UUID } from 'uuid';
import jwtDecode from 'jwt-decode';

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
    private location: Location,

    private router: Router,
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
    const resourceOptuins: IPepSmartFilterFieldOption[] = [];
    const actionstypesOptions: IPepSmartFilterFieldOption[] = [];
    const userOptions: IPepSmartFilterFieldOption[] = [];
    const addonOptions: IPepSmartFilterFieldOption[] = [];

    const distinctValues = 'Resource,ActionType,UserUUID,AddonUUID';
    this.addonService.audit_data_log_distinct_values(this.searchString, this.filtersStr, this.searchStringFields, distinctValues).subscribe(async (values) => {

      const resourceValues = values.find(x => x.APIName === 'Resource');
      const actionTypeValues = values.find(x => x.APIName === 'ActionType');
      const userUalues = values.find(x => x.APIName === 'UserUUID');
      const addonValues = values.find(x => x.APIName === 'AddonUUID');

      resourceValues.Values.forEach(resourceValue => {
        resourceOptuins.push({ value: resourceValue.key, count: resourceValue.doc_count });
      });
      actionTypeValues.Values.forEach(actionTypeValue => {
        actionstypesOptions.push({ value: actionTypeValue.key, count: actionTypeValue.doc_count });
      });

      addonValues.Values.forEach(addon => {
        const addonObject = this.addons.find(a => a.UUID === addon.key);
        addonOptions.push({ value: addonObject.Name, count: addon.doc_count });
      });

      for (let user of userUalues.Values) {
        let userDetails = this.users.find(u => u.UUID === user.key);
        let email = userDetails ? userDetails.Email : 'Pepperi Admin';
        // var admin user doesnt arrive in users api
        if (!userDetails) {
          this.users.push({ UUID: user.key, Email: email })
        }
        userOptions.push({ value: email, count: user.doc_count });
      };
      const operators: PepSmartFilterOperatorType[] = ['before', 'after', 'today', 'thisWeek', 'thisMonth', 'dateRange', 'inTheLast'];
      if (!this.fields) {
        this.fields = [
          createSmartFilterField({ id: 'AddonUUID', name: 'Addon', options: addonOptions }, 'multi-select'),
          createSmartFilterField({ id: 'Resource', name: 'Resource', options: resourceOptuins }, 'multi-select'),
          createSmartFilterField({ id: 'UserUUID', name: 'User', options: userOptions }, 'multi-select'),
          createSmartFilterField({ id: 'ActionType', name: 'Type', options: actionstypesOptions }, 'multi-select'),
          createSmartFilterField({ id: 'ActionDateTime', name: 'Action Date Time', operators }, 'date-time'),
        ];
      }
      else {
        let addonUUIDFilter = this.fields?.find(filter => filter.id == 'AddonUUID');
        let resourceFilter = this.fields?.find(filter => filter.id == 'Resource');
        let userUUIDFilter = this.fields?.find(filter => filter.id == 'UserUUID');
        let actionTypeFilter = this.fields?.find(filter => filter.id == 'ActionType');
        let actionDateTimeFilter = this.fields?.find(filter => filter.id == 'ActionDateTime');

        this.fields = [
          createSmartFilterField({ id: 'AddonUUID', name: 'Addon', options: addonOptions, isOpen: addonUUIDFilter.isOpen }, 'multi-select'),
          createSmartFilterField({ id: 'Resource', name: 'Resource', options: resourceOptuins, isOpen: resourceFilter.isOpen }, 'multi-select'),
          createSmartFilterField({ id: 'UserUUID', name: 'User', options: userOptions, isOpen: userUUIDFilter.isOpen }, 'multi-select'),
          createSmartFilterField({ id: 'ActionType', name: 'Type', options: actionstypesOptions, isOpen: actionTypeFilter.isOpen }, 'multi-select'),
          createSmartFilterField({ id: 'ActionDateTime', name: 'Action Date Time', operators, isOpen: actionDateTimeFilter.isOpen }, 'date-time'),
        ];
      }
    })
  }

  notifyValueChanged(event) {
  }

  selectedRowsChanged(selectedRowsCount: number) {
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

    this.loadDataLogsList(this.docs);
  }

  loadDataLogsList(docs) {
    const tableData = new Array<PepRowData>();
    docs.forEach((doc) => {
      const userKeys = ["ID", "Type", "Resource", "ObjectKey", "UpdatedFields", "User", "ActionDateTime"];
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
    const user = this.users.find(u => u.UUID === document.UserUUID);
    const email = user ? user.Email : 'Pepperi Admin';
    const href = 'settings/' + this.addonService.addonUUID + '/logs';
    //target="_blank" rel="noopener noreferrer"
    switch (key) {
      case "ID":
        dataRowField.ColumnWidth = 3;
        const actionUuid = document.ActionUUID === NIL_UUID ? '' : document.ActionUUID;
        const actionUuidHtml = `<span class="custom-span">${actionUuid}</span>`;
        const operationStr = `<a href="${href}?action_uuid=${document.ActionUUID}&action_date_time=${document.CreationDateTime}&addon_uuid=${document.AddonUUID}&user=${email}">${actionUuidHtml}</span></a>`
        dataRowField.FormattedValue = dataRowField.Value = this.addonService.isSupportAdminUser ? operationStr : actionUuidHtml;
        dataRowField.Title = 'ID';
        break;
      case "Type":
        dataRowField.ColumnWidth = 3;
        const actionType = this.capitalize(document.ActionType);
        dataRowField.FormattedValue = dataRowField.Value = actionType;
        break;
      case "ObjectKey":
        dataRowField.Title = 'Object ID';
        dataRowField.ColumnWidth = 3;
        dataRowField.FormattedValue = dataRowField.Value = `<span class="custom-span">${document.ObjectKey}</span>`;
        break;
      case "Resource":
        dataRowField.FieldType = FIELD_TYPE.RichTextHTML;
        dataRowField.ColumnWidth = 6;
        let addon = this.addons.find(x => x.UUID === document.AddonUUID);
        const typeStr = `<a href="${href}?addon_uuid=${document.AddonUUID}"><span class="color-link ng-star-inserted">${addon.Name}: </span></a><span>${document.Resource}</span>`
        dataRowField.FormattedValue = dataRowField.Value = this.addonService.isSupportAdminUser ? typeStr : document.Resource;
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
        dataRowField.Title = 'Date';
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

  onClick(event: Event) {
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
    console.log(JSON.stringify(filtersData))
  }

  onSearchStateChanged(searchStateChangeEvent: IPepSearchStateChangeEvent) {
  }

  onSearchAutocompleteChanged(value) {
  }

  onSearchChanged(search: any) {
    this.searchString = search.value;
    this.addonService.audit_data_log_query(this.searchString, this.filtersStr, this.searchStringFields).subscribe((docs) => {
      this.loadDataLogsList(docs);
      this.loadSmartFilters();
    })
  }

  onCustomizeFieldClick(fieldClickEvent: IPepFormFieldClickEvent) {
    let href = `/settings/${this.addonService.addonUUID}/logs?`;
    if (fieldClickEvent.key === 'Resource') {
      href += `addon_uuid=${fieldClickEvent.value}`
    } if (fieldClickEvent.key === 'ID') {
      href += `action_uuid=${fieldClickEvent.value}`
    }

    this.location.replaceState(href);
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



