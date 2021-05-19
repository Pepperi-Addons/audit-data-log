import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { FIELD_TYPE, PepDataConvertorService, PepFieldData, PepRowData, UIControl, X_ALIGNMENT_TYPE } from '@pepperi-addons/ngx-lib';
import { DEFAULT_PAGE_SIZE, IPepListPagerChangeEvent, IPepListSortingChangeEvent, PepListComponent, PepListPagerType, PepListViewType } from '@pepperi-addons/ngx-lib/list';
import { IPepMenuItemClickEvent, PepMenuItem } from '@pepperi-addons/ngx-lib/menu';
import { createSmartFilterField, IPepSmartFilterData, IPepSmartFilterField, IPepSmartFilterFieldOption, PepSmartFilterOperatorType } from '@pepperi-addons/ngx-lib/smart-filters';
import { AddonService } from '../addon/addon.service';
import { Document, UpdatedField } from '../../../../../shared/models/document'
import { IPepSearchStateChangeEvent } from '@pepperi-addons/ngx-lib/search';
import QueryUtil from '../../../../../shared/utilities/query-util';
import { PepDialogActionButton, PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';
declare var angular: any;

@Component({
  selector: 'addon-cloud-watch-logs',
  templateUrl: './cloud-watch-logs.component.html',
  styleUrls: ['./cloud-watch-logs.component.scss'],
})
export class CloudWatchLogsComponent implements OnInit {
  @ViewChild("PepListLogs") customLogsList: PepListComponent;
  @ViewChild("PepListDetails") customDetailsList: PepListComponent;

  @Input("options") selectedObjects: any;
  @Input() pagerType: PepListPagerType = 'pages';
  @Input() pageType = '';
  @Input() totalsRow = [];
  @Input() pageSize: number = DEFAULT_PAGE_SIZE;
  @Input() pageIndex = 0;
  @Input() scrollAnimationTime = 500;

  private _showItems = true;
  filtersStr: string;
  actionDateTime: any;
  endDate: Date;
  startDate: Date;
  endDateParam: Date;
  startDateParam: Date;
  auditDataLogs: Document[];
  user: any;
  details: any = '';
  get showItems() {
    return this._showItems;
  }
  totalRows = -1;
  fields: Array<IPepSmartFilterField>;
  filters: Array<IPepSmartFilterField>;
  isFiltered: boolean = false;
  searchString = '';
  levels = '';
  menuItems: Array<PepMenuItem>;
  selectedMenuItem: PepMenuItem;
  logsTitle: string = '';
  viewType: PepListViewType = "table";
  viewTypeDetailsTable: PepListViewType = "lines";

  users = [];
  docs = [];
  actionUUID = '';
  addonUUID = '';

  constructor(public translate: TranslateService,
    private dataConvertorService: PepDataConvertorService,
    private addonService: AddonService,
    public routeParams: ActivatedRoute) {
    this.addonService.addonUUID = this.routeParams.snapshot.params['addon_uuid'];
  }

  ngAfterViewInit(): void {
  }

  // private async getCloudWatchLogsAsync(tart_data: Date, end_data: Date, addon_uuid: string, action_uuid: string) {
  //   const logsResult = await this.addonService.cloud_watch_logs(tart_data, end_data, addon_uuid, action_uuid, true)
  //   const condition = (logRes) => {
  //     return logRes &&
  //       logRes.Status &&
  //       logRes.Status.Name !== "InProgress" &&
  //       logRes.Status.Name !== "InRetry" ?
  //       false : true;
  //   }
  //   this.poll(() => this.addonService.getExecutionLog(logsResult.ExecutionUUID), condition, 1500)
  //     .then(logRes => {
  //       this.pollCallback(logRes);
  //     });
  // }

  sortingChange(sortingChangeEvent: IPepListSortingChangeEvent) {
    switch (sortingChangeEvent.sortBy) {
      case 'ActionDateTime':
        this.docs = this.docs.sort((a, b) =>
          sortingChangeEvent.isAsc ?
            new Date(a.ActionDateTime).getTime() - new Date(b.ActionDateTime).getTime() :
            new Date(b.ActionDateTime).getTime() - new Date(a.ActionDateTime).getTime()
        );
        break;
    }

    console.log(`after sort by ${sortingChangeEvent.sortBy} - ascending ${sortingChangeEvent.isAsc}`, this.docs);

    this.loadDataLogsList(this.docs);

  }

  async poll(fn, fnCondition, ms) {
    let result = await fn();
    while (fnCondition(result)) {
      await this.wait(ms);
      result = await fn();
    }
    return result;
  }

  wait(ms = 1000) {
    return new Promise(resolve => {
      console.log(`waiting ${ms} ms...`);
      setTimeout(resolve, ms);
    });
  }

  pollCallback(logRes) {
    const resultObj = JSON.parse(
      logRes.AuditInfo.ResultObject
    );
    if (resultObj.status === 'Complete') {
      window.clearTimeout();
    } else if (resultObj.success == "Exception") {
      window.clearTimeout();
    }

  }

  private reloadList() {
    this.addonService.cloud_watch_logs(this.startDate, this.endDate, this.addonUUID, this.actionUUID, this.searchString, this.levels).subscribe((logs) => {
      let logsCW = this.buildLogsList(logs);
      this.docs = logsCW;
      this.loadDataLogsList(this.docs);
      this.loadDataDetailsList();
    });
  }

  private setParamsState() {
    this.routeParams.queryParams.subscribe((params) => {
      this.actionUUID = params.action_uuid;
      this.addonUUID = params.addon_uuid;
      this.actionDateTime = params.action_date_time;
      this.user = params.user;

      if (this.actionDateTime) {
        const date = new Date(this.actionDateTime);
        this.startDate = this.startDateParam = new Date(new Date(this.actionDateTime).setMinutes(date.getMinutes() - 1));
        this.endDate = this.endDateParam = new Date(new Date(this.actionDateTime).setMinutes(date.getMinutes() + 19));
      }
      else {
        var now = new Date();
        this.startDate = this.startDateParam = new Date(new Date(now).setDate(now.getDate() - 1));
        this.endDate = this.endDateParam = now;
      }

      this.loadSmartFilters();
      this.reloadList();
    });
  }

  onSearchAutocompleteChanged(value) {
  }

  onSearchStateChanged(searchStateChangeEvent: IPepSearchStateChangeEvent) {
  }
  getUtcDate() {
    var date = new Date();
    var now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
      date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds());

    return new Date(now_utc);
  }
  private buildLogsList(logs: any) {
    let cwLogs = [];

    logs.results.forEach(element => {
      cwLogs.push({
        ActionDateTime: element[0].value,
        Message: element[1].value,
        Level: element[2].value
      });
    });
    return cwLogs;
  }

  onPagerChange(event: IPepListPagerChangeEvent): void {
  }


  onFiltersChange(filtersData: IPepSmartFilterData[]) {
    this.levels = '';
    if (filtersData.length > 0) {
      let dateRange;
      for (const filter of filtersData) {
        switch (filter.operator.componentType[0]) {
          case 'date':
            this.isFiltered = true;
            dateRange = QueryUtil.getStartAndEndDateTimeByFilter(filter);
            this.startDate = dateRange.StartDateTime;
            this.endDate = dateRange.EndDateTime;
            break;
          case 'multi-select':
            let values = [];
            filter.value.first.forEach(value => {
              values.push(value)
            });
            this.levels = `'${values.join('\',\'')}'`;
        }
      }
    } else {
      this.isFiltered = false;
      this.endDate = this.endDateParam;
      this.startDate = this.startDateParam;
    }
    this.addonService.cloud_watch_logs(this.startDate, this.endDate, this.addonUUID, this.actionUUID, this.searchString, this.levels).subscribe((logs) => {
      let logsCW = this.buildLogsList(logs);
      this.docs = logsCW;
      if (this.isFiltered || this.searchString) {
        this.loadSmartFilters();
      }
      this.loadDataLogsList(this.docs);
      this.loadDataDetailsList();
    }, (err) => {
      if (err.indexOf("Unknown Server Error") > -1) {
        this.addonService.openDialog(this.translate.instant("Error"), 'please choose a shorter range')
      } else {
        this.addonService.openDialog(this.translate.instant("Error"), 'Error')
      }
    });;
  }

  ngOnInit(): void {
    this.setParamsState();
  }

  notifyValueChanged(event) {
  }

  loadDataLogsList(docs) {
    if (this.customLogsList) {
      const tableData = new Array<PepRowData>();
      docs.forEach((doc) => {
        const userKeys = ["ActionDateTime", "Level", "Message"];
        tableData.push(
          this.convertLogToPepRowData(doc, userKeys)
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

      this.customLogsList.initListData(
        uiControl,
        rows.length,
        rows,
        this.viewType,
        "",
        false
      );
    }

  }

  loadDataDetailsList() {
    if (this.customDetailsList) {
      let userKeys = [];

      const tableData = new Array<PepRowData>();
      if (this.actionUUID) {
        userKeys.push("ActionUUID")
      }
      if (this.addonUUID) {
        userKeys.push("AddonUUID")
      }
      if (this.user) {
        userKeys.push("User")
      }
      if (!this.isFiltered) {
        userKeys.push("ActionDateTime")
      }
      tableData.push(
        this.convertDetailsToPepRowData(userKeys)
      );

      if (userKeys.length > 0) {
        let rows = [];
        let uiControl;
        if (tableData.length > 0) {
          uiControl = this.getLinesUiControl();
          rows = this.dataConvertorService.convertListData(
            tableData
          );
        }

        this.customDetailsList.initListData(
          uiControl,
          rows.length,
          rows,
          this.viewTypeDetailsTable,
          "",
          false
        );
      }
    }

  }

  private loadSmartFilters(): void {
    const levels: IPepSmartFilterFieldOption[] = [];
    const sources: IPepSmartFilterFieldOption[] = [];

    this.addonService.cloud_watch_logs_stats(this.startDate, this.endDate, this.addonUUID, this.actionUUID, this.searchString, 'Level,Source', this.levels).subscribe((res) => {
      Object.keys(res['Level']).forEach(field => {

        levels.push({ value: field, count: res['Level'][field] });

      });
      Object.keys(res['Source']).forEach(field => {

        sources.push({ value: field, count: res['Source'][field] });

      });
      const operators: PepSmartFilterOperatorType[] = ['today', 'dateRange'];

      if (!this.fields) {
        this.fields = [
          createSmartFilterField({ id: 'ActionDateTime', name: 'Action Date Time', operators }, 'date-time'),
          createSmartFilterField({ id: 'Level', name: 'Level', options: levels }, 'multi-select'),
          createSmartFilterField({ id: 'Source', name: 'Source', options: sources }, 'multi-select')
        ];

      }
      else {
        let levelFilter = this.fields?.find(filter => filter.id == 'Level');
        let actionDateTimeFilter = this.fields?.find(filter => filter.id == 'ActionDateTime');
        let sourceFilter = this.fields?.find(filter => filter.id == 'Source');

        this.fields = [
          createSmartFilterField({ id: 'ActionDateTime', name: 'Action Date Time', operators, isOpen: actionDateTimeFilter.isOpen }, 'date-time'),
          createSmartFilterField({ id: 'Level', name: 'Level', options: levels, isOpen: levelFilter.isOpen }, 'multi-select'),
          createSmartFilterField({ id: 'Source', name: 'Source', options: sources, isOpen: sourceFilter.isOpen }, 'multi-select')
        ];
      }


    });

  }

  onSearchChanged(search: any) {
    this.searchString = search.value;
    this.addonService.cloud_watch_logs(this.startDate, this.endDate, this.addonUUID, this.actionUUID, this.searchString, this.levels).subscribe((docs) => {
      let logsCW = this.buildLogsList(docs);
      this.docs = logsCW;
      this.loadSmartFilters();
      this.loadDataLogsList(this.docs);
    })
  }


  convertLogToPepRowData(doc: Document, customKeys) {
    const row = new PepRowData();
    row.Fields = [];
    customKeys.forEach((key) =>
      row.Fields.push(this.initDataRowFieldOfLogs(doc, key))
    );
    return row;
  }

  convertDetailsToPepRowData(customKeys) {
    const row = new PepRowData();
    row.Fields = [];
    customKeys.forEach((key) =>
      row.Fields.push(this.initDataRowFieldOfDetail(key))
    );
    return row;
  }

  initDataRowFieldOfLogs(log: any, key: any): PepFieldData {
    const dataRowField: PepFieldData = {
      ApiName: key,
      Title: this.translate.instant(key),
      XAlignment: X_ALIGNMENT_TYPE.Left,
      FormattedValue: log[key] ? log[key] : "",
      Value: log[key] ? log[key] : "",
      ColumnWidth: 10,
      OptionalValues: [],
      FieldType: FIELD_TYPE.TextBox,
      Enabled: false
    };
    switch (key) {
      case "ActionDateTime":
        dataRowField.ColumnWidth = 5;
        dataRowField.FormattedValue = dataRowField.Value = log['ActionDateTime'];
        break;
      case "Level":
        dataRowField.ColumnWidth = 2;

        dataRowField.FormattedValue = dataRowField.Value = log['Level'] ? log['Level'] : '';
        break;
      case "Message":
        dataRowField.ColumnWidth = 30;
        dataRowField.FormattedValue = dataRowField.Value = log['Message'];
        break;
      default:
        dataRowField.FormattedValue = log[key]
          ? log[key].toString()
          : "";
        break;
    }
    return dataRowField;
  }

  initDataRowFieldOfDetail(key: any): PepFieldData {
    const dataRowField: PepFieldData = {
      ApiName: key,
      Title: this.translate.instant(key),
      XAlignment: X_ALIGNMENT_TYPE.Left,
      FormattedValue: "",
      Value: "",
      ColumnWidth: 10,
      OptionalValues: [],
      FieldType: FIELD_TYPE.TextBox,
      Enabled: false
    };
    switch (key) {
      case "ActionDateTime":
        dataRowField.FormattedValue = dataRowField.Value = ` ${this.startDate.toLocaleString()} - ${this.endDate.toLocaleString()}`;;
        break;
      case "AddonUUID":
        dataRowField.FormattedValue = dataRowField.Value = this.addonUUID;
        break;
      case "ActionUUID":
        dataRowField.FormattedValue = dataRowField.Value = this.actionUUID;
        break;
      case "User":
        dataRowField.FormattedValue = dataRowField.Value = this.user;
        break;
      default:

        break;
    }
    return dataRowField;
  }

  private getLinesUiControl(): UIControl {
    return JSON.parse(
      `{
            "Columns": 4,
            "ControlFields": [
                  {
                    "ApiName": "User",
                    "ColumnWidth": 10,
                    "ColumnWidthType": 0,
                    "FieldName": "User",
                    "FieldType": 1,
                    "Layout": {
                        "Height": 0,
                        "LineNumber": 0,
                        "Width": 4,
                        "X": 0,
                        "XAlignment": 0,
                        "Y": 0,
                        "YAlignment": 0
                    },
                    "Mandatory": false,
                    "MaxFieldCharacters": 0,
                    "MaxFieldLines": 0,
                    "MaxValue": 1000000000,
                    "MinValue": -1000000000,
                    "ReadOnly": true,
                    "Title": "User"
                },
                {
                    "ApiName": "AddonUUID",
                    "ColumnWidth": 10,
                    "ColumnWidthType": 0,
                    "FieldName": "AddonUUID",
                    "FieldType": 1,
                    "Layout": {
                        "Height": 0,
                        "LineNumber": 0,
                        "Width": 4,
                        "X": 0,
                        "XAlignment": 0,
                        "Y": 0,
                        "YAlignment": 1
                    },
                    "Mandatory": false,
                    "MaxFieldCharacters": 0,
                    "MaxFieldLines": 0,
                    "MaxValue": 1000000000,
                    "MinValue": -1000000000,
                    "ReadOnly": true,
                    "Title": "Addon UUID"
                },                                       
                {
                  "ApiName": "ActionDateTime",
                  "ColumnWidth": 20,
                  "ColumnWidthType": 0,
                  "FieldName": "Action Date Time",
                  "FieldType": 1,
                  "Layout": {
                      "Height": 0,
                      "LineNumber": 0,
                      "Width": 5,
                      "X": 0,
                      "XAlignment": 0,
                      "Y": 0,
                      "YAlignment": 2
                  },
                  "Mandatory": false,
                  "MaxFieldCharacters": 0,
                  "MaxFieldLines": 0,
                  "MaxValue": 1000000000,
                  "MinValue": -1000000000,
                  "ReadOnly": true,
                  "Title": "Action Date Time"
              },
              {
                "ApiName": "ActionUUID",
                "ColumnWidth": 10,
                "ColumnWidthType": 0,
                "FieldName": "ActionUUID",
                "FieldType": 1,
                "Layout": {
                    "Height": 0,
                    "LineNumber": 0,
                    "Width": 5,
                    "X": 0,
                    "XAlignment": 0,
                    "Y": 0,
                    "YAlignment": 3
                },
                "Mandatory": false,
                "MaxFieldCharacters": 0,
                "MaxFieldLines": 0,
                "MaxValue": 1000000000,
                "MinValue": -1000000000,
                "ReadOnly": true,
                "Title": "Action UUID"
            }
                
            ]
        }`
    );
  }
}