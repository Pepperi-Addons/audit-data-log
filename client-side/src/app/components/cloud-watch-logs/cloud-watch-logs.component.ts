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
  get showItems() {
    return this._showItems;
  }
  totalRows = -1;
  fields: Array<IPepSmartFilterField>;
  filters: Array<IPepSmartFilterData>;
  searchString = '';
  menuItems: Array<PepMenuItem>;
  selectedMenuItem: PepMenuItem;

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

  private reloadList() {
    this.routeParams.queryParams.subscribe((params) => {
      this.actionUUID = params.action_uuid;
      this.addonUUID = params.addon_uuid;
      this.actionDateTime = params.action_date_time;
      const date = new Date(this.actionDateTime);
      const startDate = new Date(new Date(this.actionDateTime).setMinutes(date.getMinutes() - 10));
      const endDate = new Date(new Date(this.actionDateTime).setMinutes(date.getMinutes() + 10));
      this.addonService.cloud_watch_logs(startDate, endDate, undefined, this.actionUUID).then((logs) => {
        logs.results.forEach(element => {
          this.docs.push({
            ActionDateTime: element[0].value,
            Message: element[1].value,
            AddonUUID: this.addonUUID,
            ActionUUID: this.actionUUID,
          });
        });
        this.loadDataLogsList(this.docs);
      });
    })

  }

  onFiltersChange(filtersData: IPepSmartFilterData[]) {

  }

  onPagerChange(event: IPepListPagerChangeEvent): void {
  }

  ngOnInit(): void {
    this.reloadList();

  }


  notifyValueChanged(event) {
    debugger;
  }

  loadDataLogsList(docs) {
    const tableData = new Array<PepRowData>();
    docs.forEach((doc) => {
      const userKeys = ["ActionDateTime", "Message"];
      if (this.actionUUID) {
        userKeys.push('ActionUUID');
      }
      if (this.addonUUID) {
        userKeys.push('AddonUUID');
      }
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
      case "AddonUUID":
        dataRowField.ColumnWidth = 30;
        dataRowField.FormattedValue = dataRowField.Value = document['AddonUUID'];

        break;
      case "ActionUUID":
        dataRowField.ColumnWidth = 30;
        dataRowField.FormattedValue = dataRowField.Value = document['ActionUUID'];

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