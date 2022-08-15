import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AuditDataLogBlockComponent } from './index';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
// import { AuditDataLogComponent } from '../audit-data-log/audit-data-log.component';
import { AuditDataLogBlock } from './audit-data-log-block.service';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { PepPageLayoutModule } from '@pepperi-addons/ngx-lib/page-layout';
import { PepListModule } from '@pepperi-addons/ngx-lib/list';
import { config } from 'src/app/addon.config';

@NgModule({
    declarations: [
        AuditDataLogBlockComponent,
        // AuditDataLogComponent

    ],
    imports: [
        CommonModule,
        BrowserAnimationsModule,
        PepPageLayoutModule,
        PepListModule,
        TranslateModule.forChild({
            loader: {
                provide: TranslateLoader,
                useFactory: (addonService: PepAddonService) => 
                    PepAddonService.createMultiTranslateLoader(config.AddonUUID, addonService, ['ngx-lib']),
                deps: [PepAddonService]
            }, isolate: false
        }),
    ],
    exports: [AuditDataLogBlockComponent],
    providers: [
        TranslateStore,
        AuditDataLogBlock
    ]
})
export class AuditDataLogBlockModule {
    constructor(
        translate: TranslateService,
        private pepAddonService: PepAddonService
    ) {
        this.pepAddonService.setDefaultTranslateLang(translate);
    }
}




