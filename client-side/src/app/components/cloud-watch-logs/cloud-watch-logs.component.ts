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

  constructor(public translate: TranslateService,
    private dataConvertorService: PepDataConvertorService,
    private addonService: AddonService,
    public routeParams: ActivatedRoute) {
    this.addonService.addonUUID = this.routeParams.snapshot.params['addon_uuid'];
  }

  ngAfterViewInit(): void {
  }

  private reloadList() {
    this.addonService.cloud_watch_logs('2021-05-01T05:28:42Z', '2021-05-04T05:28:42Z').then((logs) => {
      logs.results.forEach(element => {

        this.docs.push({
          ActionDateTime: element[0].value,
          Message: element[1].value,

        });
      });
      this.loadDataLogsList(this.docs);
    });

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
      FieldType: FIELD_TYPE.RichTextHTML,
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