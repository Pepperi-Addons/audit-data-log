import { Component, OnInit } from '@angular/core';
import { PepCustomizationService, PepLoaderService, PepStyleType } from '@pepperi-addons/ngx-lib';
import { AuditDataLogBlock } from './components/audit-data-log-block/audit-data-log-block.service';

declare var CLIENT_MODE: any;

@Component({
    selector: 'addon-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    providers: [AuditDataLogBlock]
})
export class AppComponent implements OnInit {
    constructor(
    ) {
    }

    ngOnInit() {
    }

}
