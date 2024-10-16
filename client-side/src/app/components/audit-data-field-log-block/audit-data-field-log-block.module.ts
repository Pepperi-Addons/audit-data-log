import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuditDataFieldLogBlockComponent } from './audit-data-field-log-block.component';
import { TranslateLoader, TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import { PepAddonService } from '@pepperi-addons/ngx-lib';
import { config } from 'src/app/addon.config';
import { PepGenericListModule } from '@pepperi-addons/ngx-composite-lib/generic-list';


@NgModule({
  declarations: [AuditDataFieldLogBlockComponent],
  imports: [
    CommonModule,
    PepGenericListModule,
    TranslateModule.forChild({
      loader: {
        provide: TranslateLoader,
        useFactory: (addonService: PepAddonService) =>
          PepAddonService.createMultiTranslateLoader(config.AddonUUID, addonService, ['ngx-lib']),
        deps: [PepAddonService]
      }, isolate: false
    }),
  ],
  providers: [TranslateStore]
})
export class AuditDataFieldLogBlockModule {
  constructor(
    translate: TranslateService,
    private pepAddonService: PepAddonService
  ) {
    this.pepAddonService.setDefaultTranslateLang(translate);
  }
}
