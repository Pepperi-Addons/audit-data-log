import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AsyncJobsBlockComponent } from './async-jobs-block.component';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { config } from 'src/app/addon.config';
import { PepIconRegistry, pepIconSystemClose } from '@pepperi-addons/ngx-lib/icon';
import { AuditDataLogBlock } from '../audit-data-log-block/audit-data-log-block.service';
import { PepGenericListModule } from '@pepperi-addons/ngx-composite-lib/generic-list';
import { AsyncJobAuditLogDialogComponent } from './async-job-audit-log-dialog/async-job-audit-log-dialog.component';
import { NgxJsonViewerModule } from 'ngx-json-viewer';
import { PepDialogModule } from '@pepperi-addons/ngx-lib/dialog';

const pepIcons = [
  pepIconSystemClose,
];

@NgModule({
  declarations: [
    AsyncJobsBlockComponent,
    AsyncJobAuditLogDialogComponent
  ],
  imports: [
    CommonModule,
    PepGenericListModule,
    NgxJsonViewerModule,
    PepDialogModule,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: (addonService: PepAddonService) =>
          PepAddonService.createMultiTranslateLoader(config.AddonUUID, addonService, ['ngx-lib', 'ngx-composite-lib']),
        deps: [PepAddonService]
      }
    }),
  ],
  providers: [TranslateStore, AuditDataLogBlock]
})
export class AsyncJobsBlockModule {
  constructor(
    translate: TranslateService,
    private pepIconRegistry: PepIconRegistry,
    private pepAddonService: PepAddonService
  ) {
    this.pepAddonService.setDefaultTranslateLang(translate);
    this.pepIconRegistry.registerIcons(pepIcons);
  }
}
