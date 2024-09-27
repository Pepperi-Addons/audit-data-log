import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CodeJobExecutionsBlockComponent } from './code-job-executions-block.component';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { config } from 'src/app/addon.config';
import { PepIconRegistry, pepIconSystemClose } from '@pepperi-addons/ngx-lib/icon';
import { AuditDataLogBlock } from '../audit-data-log-block/audit-data-log-block.service';

const pepIcons = [
  pepIconSystemClose,
];

@NgModule({
  declarations: [
    CodeJobExecutionsBlockComponent
  ],
  imports: [
    CommonModule,
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
export class CodeJobExecutionsBlockModule {
  constructor(
    translate: TranslateService,
    private pepIconRegistry: PepIconRegistry,
    private pepAddonService: PepAddonService
  ) {
    this.pepAddonService.setDefaultTranslateLang(translate);
    this.pepIconRegistry.registerIcons(pepIcons);
  }
}
