import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { FIELD_TYPE, PepDataConvertorService, PepFieldData, PepRowData, X_ALIGNMENT_TYPE } from '@pepperi-addons/ngx-lib';
import { DEFAULT_PAGE_SIZE, IPepListPagerChangeEvent, IPepListSortingChangeEvent, PepListComponent, PepListPagerType, PepListViewType } from '@pepperi-addons/ngx-lib/list';
import { IPepMenuItemClickEvent, PepMenuItem } from '@pepperi-addons/ngx-lib/menu';
import { createSmartFilterField, IPepSmartFilterData, IPepSmartFilterField, IPepSmartFilterFieldOption, PepSmartFilterOperatorType } from '@pepperi-addons/ngx-lib/smart-filters';
import { AddonService } from '../addon/addon.service';
import { Document, UpdatedField } from '../../../../../shared/models/document'
import { IPepSearchStateChangeEvent } from '@pepperi-addons/ngx-lib/search';
import QueryUtil from '../../../../../shared/utilities/query-util';
import { PepDialogActionButton, PepDialogData, PepDialogService } from '@pepperi-addons/ngx-lib/dialog';

@Component({
  selector: 'addon-cloud-watch-logs',
  templateUrl: './cloud-watch-logs.component.html',
  styleUrls: ['./cloud-watch-logs.component.scss']
})
export class CloudWatchLogsComponent implements OnInit {
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
  actionDateTime: any;
  endDate: Date;
  startDate: Date;
  endDateParam: Date;
  startDateParam: Date;
  get showItems() {
    return this._showItems;
  }
  totalRows = -1;
  fields: Array<IPepSmartFilterField>;
  filters: Array<IPepSmartFilterData>;
  searchString = '';
  menuItems: Array<PepMenuItem>;
  selectedMenuItem: PepMenuItem;
  logsTitle: string = '';
  viewType: PepListViewType = "table";
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

    debugger;
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
    this.routeParams.queryParams.subscribe((params) => {
      this.actionUUID = params.action_uuid;
      this.addonUUID = params.addon_uuid;
      this.actionDateTime = params.action_date_time;
      const date = new Date(this.actionDateTime);
      if (this.actionDateTime) {
        this.startDate = this.startDateParam = new Date(new Date(this.actionDateTime).setMinutes(date.getMinutes() - 10));
        this.endDate = this.endDateParam = new Date(new Date(this.actionDateTime).setMinutes(date.getMinutes() + 10));
      }
      else {
        var now = new Date()
        this.startDate = new Date(new Date(now).setDate(now.getDate() - 1));
        this.endDate = now;
      }
      this.setLogsTitle(this.startDate, this.endDate);

      this.addonService.cloud_watch_logs(this.startDate, this.endDate, this.addonUUID, this.actionUUID, this.searchString).subscribe((logs) => {
        let logsCW = this.buildLogsList(logs);
        this.docs = logsCW;
        this.loadDataLogsList(this.docs);
      });
    })

  }

  onSearchAutocompleteChanged(value) {
    console.log(value);
    // debugger;
  }

  onSearchStateChanged(searchStateChangeEvent: IPepSearchStateChangeEvent) {
    // debugger;
  }

  private setLogsTitle(startDate: Date, endDate: Date) {
    this.logsTitle = '';
    if (this.actionUUID) {
      this.logsTitle += `Action UUID: ${this.actionUUID}, `;
    }
    if (this.addonUUID) {
      this.logsTitle += `Addon UUID: ${this.addonUUID}, `;
    }
    this.logsTitle += `${startDate.toLocaleString()} - ${endDate.toLocaleString()}`;
  }

  private buildLogsList(logs: any) {
    let cwLogs = [];

    logs.results.forEach(element => {
      cwLogs.push({
        ActionDateTime: element[0].value,
        Message: element[1].value,
        AddonUUID: this.addonUUID,
        ActionUUID: this.actionUUID,
      });
    });
    return cwLogs;
  }

  onPagerChange(event: IPepListPagerChangeEvent): void {
  }


  onFiltersChange(filtersData: IPepSmartFilterData[]) {
    if (filtersData.length > 0) {
      let dateRange;
      for (const filter of filtersData) {
        switch (filter.operator.componentType[0]) {
          case 'date':
            dateRange = QueryUtil.getStartAndEndDateTimeByFilter(filter);
            this.startDate = dateRange.StartDateTime;
            this.endDate = dateRange.EndDateTime;
            break;
        }
      }
    } else {
      this.endDate = this.endDateParam;
      this.startDate = this.startDateParam;
    }
    this.addonService.cloud_watch_logs(this.startDate, this.endDate, this.addonUUID, this.actionUUID, this.searchString).subscribe((logs) => {
      let logsCW = this.buildLogsList(logs);
      this.docs = logsCW;
      this.loadDataLogsList(this.docs);
      this.setLogsTitle(this.startDate, this.endDate);
    }, (err) => {
      if (err.indexOf("Unknown Server Error") > -1) {
        this.addonService.openDialog(this.translate.instant("Error"), 'please choose a shorter range')
      } else {
        this.addonService.openDialog(this.translate.instant("Error"), 'Error')
      }
    });;
    debugger;
    console.log(JSON.stringify(filtersData))
  }

  ngOnInit(): void {
    this.loadSmartFilters();
    this.reloadList();
  }

  notifyValueChanged(event) {
    debugger;
  }

  loadDataLogsList(docs) {
    const tableData = new Array<PepRowData>();
    docs.forEach((doc) => {
      const userKeys = ["ActionDateTime", "Message"];
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

  private loadSmartFilters(): void {
    const operators: PepSmartFilterOperatorType[] = ['today', 'dateRange'];
    this.fields = [
      createSmartFilterField({ id: 'ActionDateTime', name: 'Action Date Time', operators }, 'date-time')];
  }

  onSearchChanged(search: any) {
    this.searchString = search.value;
    this.addonService.cloud_watch_logs(this.startDate, this.endDateParam, this.addonUUID, this.actionUUID, this.searchString).subscribe((docs) => {
      this.loadDataLogsList(docs);
    })
    console.log(search);
    debugger;
  }

  convertConflictToPepRowData(doc: Document, customKeys) {
    const row = new PepRowData();
    row.Fields = [];
    customKeys.forEach((key) =>
      row.Fields.push(this.initDataRowFieldOfConflicts(doc, key))
    );
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
      FieldType: FIELD_TYPE.TextBox,
      Enabled: false
    };
    switch (key) {
      case "ActionDateTime":
        dataRowField.FormattedValue = dataRowField.Value = document['ActionDateTime'];
        break;
      case "Message":
        dataRowField.ColumnWidth = 30;
        dataRowField.FormattedValue = dataRowField.Value = document['Message'];
        break;
      default:
        dataRowField.FormattedValue = document[key]
          ? document[key].toString()
          : "";
        break;
    }
    return dataRowField;
  }

}